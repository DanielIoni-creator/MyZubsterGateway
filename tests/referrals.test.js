const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createReferralService } = require('../services/referralService');
const { createReferralRouter } = require('../routes/referrals');

function clone(value) {
  return value ? structuredClone(value) : value;
}

function createMemoryStore() {
  const accounts = new Map();

  return {
    async getByShopId(shopId) {
      return clone(accounts.get(shopId));
    },
    async getByCode(code) {
      return clone([...accounts.values()].find(account => account.code === code));
    },
    async createAccount(account) {
      accounts.set(account.shopId, clone(account));
      return clone(account);
    },
    async addReferral(code, referral) {
      const account = [...accounts.values()].find(item => item.code === code);
      const alreadyUsed = [...accounts.values()].some(item =>
        item.referrals.some(existing => existing.referredShopId === referral.referredShopId)
      );
      if (!account || account.shopId === referral.referredShopId || alreadyUsed) return null;
      account.referrals.push(clone(referral));
      account.creditsAvailableMYZ += referral.rewardMYZ;
      return clone(account);
    },
    async applyCredit(shopId, walletAddress, amountMYZ) {
      const account = accounts.get(shopId);
      if (!account || account.walletAddress !== walletAddress || account.creditsAvailableMYZ < amountMYZ) {
        return null;
      }
      account.creditsAvailableMYZ -= amountMYZ;
      account.creditsUsedMYZ += amountMYZ;
      return clone(account);
    }
  };
}

function callRoute(router, method, path, { body = {}, params = {} } = {}) {
  const layer = router.stack.find(item => item.route?.path === path && item.route.methods[method]);
  assert.ok(layer, `missing ${method.toUpperCase()} ${path}`);
  const req = { body, params };
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ statusCode: this.statusCode, body: payload }); }
    };
    Promise.resolve(layer.route.stack[0].handle(req, res, reject)).catch(reject);
  });
}

describe('referral service', () => {
  let service;

  beforeEach(() => {
    service = createReferralService({
      store: createMemoryStore(),
      codeGenerator: () => 'SHOP123',
      baseUrl: 'https://example.test/'
    });
  });

  it('creates a stable referral link for a wallet-bound shop', async () => {
    const first = await service.registerShop({ shopId: 'shop-a', walletAddress: 'wallet-a' });
    const second = await service.registerShop({ shopId: 'shop-a', walletAddress: 'wallet-a' });

    assert.equal(first.code, 'SHOP123');
    assert.equal(first.referralUrl, 'https://example.test/referral/SHOP123');
    assert.deepEqual(second, first);
  });

  it('credits 5 MYZ once when a referred shop signs up', async () => {
    await service.registerShop({ shopId: 'shop-a', walletAddress: 'wallet-a' });
    const dashboard = await service.trackReferral({
      code: 'shop123',
      referredShopId: 'shop-b',
      referredWalletAddress: 'wallet-b'
    });

    assert.equal(dashboard.creditsAvailableMYZ, 5);
    assert.equal(dashboard.referralCount, 1);
    await assert.rejects(
      service.trackReferral({ code: 'SHOP123', referredShopId: 'shop-b', referredWalletAddress: 'wallet-b' }),
      error => error.statusCode === 409
    );
  });

  it('rejects self-referrals', async () => {
    await service.registerShop({ shopId: 'shop-a', walletAddress: 'wallet-a' });
    await assert.rejects(
      service.trackReferral({ code: 'SHOP123', referredShopId: 'shop-a', referredWalletAddress: 'wallet-a' }),
      /cannot refer itself/
    );
  });

  it('applies credit only to the linked wallet', async () => {
    await service.registerShop({ shopId: 'shop-a', walletAddress: 'wallet-a' });
    await service.trackReferral({ code: 'SHOP123', referredShopId: 'shop-b', referredWalletAddress: 'wallet-b' });

    await assert.rejects(
      service.applyCredit({ shopId: 'shop-a', walletAddress: 'wrong-wallet', amountMYZ: 2 }),
      error => error.statusCode === 403
    );
    const applied = await service.applyCredit({ shopId: 'shop-a', walletAddress: 'wallet-a', amountMYZ: 3 });
    assert.deepEqual(applied, {
      appliedMYZ: 3,
      walletAddress: 'wallet-a',
      creditsAvailableMYZ: 2,
      creditsUsedMYZ: 3
    });
  });
});

describe('referral routes', () => {
  it('exposes registration and dashboard endpoints', async () => {
    const service = createReferralService({
      store: createMemoryStore(),
      codeGenerator: () => 'ROUTE123',
      baseUrl: 'https://example.test'
    });
    const router = createReferralRouter(service);

    const created = await callRoute(router, 'post', '/shops', {
      body: { shopId: 'shop-route', walletAddress: 'wallet-route' }
    });
    assert.equal(created.statusCode, 201);

    const dashboard = await callRoute(router, 'get', '/shops/:shopId', {
      params: { shopId: 'shop-route' }
    });
    assert.equal(dashboard.statusCode, 200);
    assert.equal(dashboard.body.data.referralUrl, 'https://example.test/referral/ROUTE123');
  });
});
