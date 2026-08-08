const crypto = require('crypto');
const ReferralAccount = require('../models/ReferralAccount');

const REFERRAL_REWARD_MYZ = 5;

class ReferralError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'ReferralError';
    this.statusCode = statusCode;
  }
}

function normalizeRequired(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ReferralError(`${field} is required`);
  }
  return value.trim();
}

function createMongooseStore(model = ReferralAccount) {
  return {
    getByShopId(shopId) {
      return model.findOne({ shopId }).lean();
    },
    getByCode(code) {
      return model.findOne({ code }).lean();
    },
    createAccount(account) {
      return model.create(account).then(doc => doc.toObject());
    },
    async addReferral(code, referral) {
      const account = await model.findOneAndUpdate({
        code,
        shopId: { $ne: referral.referredShopId },
        'referrals.referredShopId': { $ne: referral.referredShopId }
      }, {
        $push: { referrals: referral },
        $inc: { creditsAvailableMYZ: referral.rewardMYZ }
      }, { new: true, runValidators: true }).lean();
      return account;
    },
    applyCredit(shopId, walletAddress, amountMYZ) {
      return model.findOneAndUpdate({
        shopId,
        walletAddress,
        creditsAvailableMYZ: { $gte: amountMYZ }
      }, {
        $inc: {
          creditsAvailableMYZ: -amountMYZ,
          creditsUsedMYZ: amountMYZ
        }
      }, { new: true, runValidators: true }).lean();
    }
  };
}

function publicAccount(account, baseUrl) {
  return {
    shopId: account.shopId,
    walletAddress: account.walletAddress,
    code: account.code,
    referralUrl: `${baseUrl.replace(/\/$/, '')}/referral/${account.code}`,
    creditsAvailableMYZ: account.creditsAvailableMYZ,
    creditsUsedMYZ: account.creditsUsedMYZ,
    referralCount: account.referrals.length,
    referrals: account.referrals
  };
}

function createReferralService({
  store = createMongooseStore(),
  codeGenerator = () => crypto.randomBytes(5).toString('hex').toUpperCase(),
  baseUrl = process.env.PUBLIC_APP_URL || 'https://myzubster.com'
} = {}) {
  async function registerShop({ shopId, walletAddress }) {
    const normalizedShopId = normalizeRequired(shopId, 'shopId');
    const normalizedWallet = normalizeRequired(walletAddress, 'walletAddress');
    const existing = await store.getByShopId(normalizedShopId);

    if (existing) {
      if (existing.walletAddress !== normalizedWallet) {
        throw new ReferralError('shopId is already linked to another wallet', 409);
      }
      return publicAccount(existing, baseUrl);
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const account = await store.createAccount({
          shopId: normalizedShopId,
          walletAddress: normalizedWallet,
          code: codeGenerator(),
          creditsAvailableMYZ: 0,
          creditsUsedMYZ: 0,
          referrals: []
        });
        return publicAccount(account, baseUrl);
      } catch (error) {
        if (error?.code !== 11000) throw error;
        const raced = await store.getByShopId(normalizedShopId);
        if (raced) return publicAccount(raced, baseUrl);
      }
    }
    throw new ReferralError('could not generate a unique referral code', 503);
  }

  async function trackReferral({ code, referredShopId, referredWalletAddress }) {
    const normalizedCode = normalizeRequired(code, 'code').toUpperCase();
    const normalizedShopId = normalizeRequired(referredShopId, 'referredShopId');
    const normalizedWallet = normalizeRequired(referredWalletAddress, 'referredWalletAddress');
    const referrer = await store.getByCode(normalizedCode);

    if (!referrer) throw new ReferralError('referral code not found', 404);
    if (referrer.shopId === normalizedShopId) {
      throw new ReferralError('a shop cannot refer itself');
    }

    try {
      const updated = await store.addReferral(normalizedCode, {
        referredShopId: normalizedShopId,
        referredWalletAddress: normalizedWallet,
        rewardMYZ: REFERRAL_REWARD_MYZ,
        creditedAt: new Date()
      });
      if (!updated) throw new ReferralError('shop has already used a referral code', 409);
      return publicAccount(updated, baseUrl);
    } catch (error) {
      if (error?.code === 11000) {
        throw new ReferralError('shop has already used a referral code', 409);
      }
      throw error;
    }
  }

  async function getDashboard(shopId) {
    const normalizedShopId = normalizeRequired(shopId, 'shopId');
    const account = await store.getByShopId(normalizedShopId);
    if (!account) throw new ReferralError('referral account not found', 404);
    return publicAccount(account, baseUrl);
  }

  async function applyCredit({ shopId, walletAddress, amountMYZ }) {
    const normalizedShopId = normalizeRequired(shopId, 'shopId');
    const normalizedWallet = normalizeRequired(walletAddress, 'walletAddress');
    const amount = Number(amountMYZ);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ReferralError('amountMYZ must be a positive number');
    }

    const updated = await store.applyCredit(normalizedShopId, normalizedWallet, amount);
    if (!updated) {
      const account = await store.getByShopId(normalizedShopId);
      if (!account) throw new ReferralError('referral account not found', 404);
      if (account.walletAddress !== normalizedWallet) {
        throw new ReferralError('wallet does not match referral account', 403);
      }
      throw new ReferralError('insufficient referral credit', 409);
    }

    return {
      appliedMYZ: amount,
      walletAddress: updated.walletAddress,
      creditsAvailableMYZ: updated.creditsAvailableMYZ,
      creditsUsedMYZ: updated.creditsUsedMYZ
    };
  }

  return { registerShop, trackReferral, getDashboard, applyCredit };
}

module.exports = {
  REFERRAL_REWARD_MYZ,
  ReferralError,
  createMongooseStore,
  createReferralService
};
