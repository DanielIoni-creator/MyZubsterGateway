// tests/unit/services/webhook.test.js
// Unit tests for the webhook service. We avoid hitting MongoDB / network by
// injecting a fake transport and a fake clock into the constructor, and by
// stubbing the Mongoose models with in-memory fakes.
//
// Created for issue #42: Implement Webhook System for Order Events.
'use strict';

const crypto = require('crypto');

// We require the service BEFORE defining the model mocks so that the
// `require('../models/Webhook')` and `require('../models/WebhookDelivery')`
// calls inside the service can resolve to our fakes.
jest.mock('../../../models/Webhook', () => {
  return class FakeWebhook {};
});
jest.mock('../../../models/WebhookDelivery', () => {
  return class FakeWebhookDelivery {};
});

const fakeWebhookModel = require('../../../models/Webhook');
const fakeDeliveryModel = require('../../../models/WebhookDelivery');

const {
  WebhookService,
  computeSignature,
  buildBackoff,
  SIGNATURE_HEADER,
  EVENT_HEADER,
} = require('../../../services/outboundWebhookService');

function okTransport() {
  return jest.fn(async (url, payload, options) => ({
    ok: true,
    status: 200,
    body: 'OK',
    error: null,
  }));
}

function failingTransport(failTimes) {
  let calls = 0;
  return jest.fn(async () => {
    calls += 1;
    if (calls <= failTimes) {
      return { ok: false, status: 503, body: 'down', error: 'service unavailable' };
    }
    return { ok: true, status: 200, body: 'recovered', error: null };
  });
}

function alwaysFailTransport() {
  return jest.fn(async () => ({
    ok: false,
    status: 500,
    body: 'no',
    error: 'boom',
  }));
}

// In-memory model stubs
function installFakeWebhookModel(seed = []) {
  const state = { items: seed.slice(), nextId: seed.length + 1 };
  fakeWebhookModel.find = jest.fn((query) => {
    const events = (query && query.events) || null;
    const active = !query || query.active !== false;
    return Promise.resolve(
      state.items
        .filter((w) => active === undefined || w.active === active)
        .filter((w) =>
          !events ? true : w.events.includes(events.toLowerCase())
        )
    );
  });
  fakeWebhookModel.findById = jest.fn((id) => {
    return Promise.resolve(state.items.find((w) => String(w._id) === String(id)) || null);
  });
  fakeWebhookModel.create = jest.fn(async (doc) => {
    state.nextId += 1;
    const created = Object.assign({}, doc, {
      _id: `wh_${state.nextId}`,
      toObject: function () { return Object.assign({}, this); },
      toClientJSON: function () { return this.toObject(); },
      toAdminJSON: function () { return this.toObject(); },
    });
    state.items.push(created);
    return created;
  });
  return state;
}

function installFakeDeliveryModel() {
  const store = [];
  fakeDeliveryModel.create = jest.fn(async (doc) => {
    const id = `d_${store.length + 1}`;
    const rec = {
      _id: id,
      ...doc,
      save: async function () {
        // update in place to mimic Mongoose
        Object.assign(store[store.indexOf(this)], this);
        return this;
      },
    };
    store.push(rec);
    return rec;
  });
  return store;
}

describe('webhookService core', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('computeSignature produces sha256 HMAC with stable length', () => {
    const sig = computeSignature('topsecret', '{"foo":"bar"}');
    expect(sig.startsWith('sha256=')).toBe(true);
    // hex of a 32-byte digest = 64 chars + 7 char prefix
    expect(sig.length).toBe(7 + 64);
    // Deterministic
    const again = computeSignature('topsecret', '{"foo":"bar"}');
    expect(sig).toBe(again);

    // Different secret yields different signature
    const other = computeSignature('different', '{"foo":"bar"}');
    expect(other).not.toBe(sig);
  });

  test('buildBackoff grows exponentially but caps at maxDelayMs', () => {
    const cfg = { initialDelayMs: 1000, maxDelayMs: 16000 };
    expect(buildBackoff(1, cfg)).toBe(1000); // 1 * 1000
    expect(buildBackoff(2, cfg)).toBe(2000); // 2 * 1000
    expect(buildBackoff(3, cfg)).toBe(4000);
    expect(buildBackoff(4, cfg)).toBe(8000);
    expect(buildBackoff(5, cfg)).toBe(16000);
    expect(buildBackoff(6, cfg)).toBe(16000); // capped
  });

  test('verifySignature uses constant-time comparison', () => {
    const svc = new WebhookService();
    const body = '{"a":1}';
    const good = computeSignature('s', body);
    expect(svc.verifySignature('s', body, good)).toBe(true);
    expect(svc.verifySignature('s', body, 'sha256=oops')).toBe(false);
    expect(svc.verifySignature('s', body, undefined)).toBe(false);
    expect(svc.verifySignature('s', body, '')).toBe(false);
  });

  test('triggerEvent throws on empty event name', async () => {
    const transport = okTransport();
    const svc = new WebhookService({ transport });
    await expect(svc.triggerEvent('', { foo: 1 })).rejects.toThrow(/event/);
  });

  test('triggerEvent with no subscribers returns zero counts', async () => {
    installFakeWebhookModel([]);
    installFakeDeliveryModel();
    const transport = okTransport();
    const svc = new WebhookService({ transport });
    const out = await svc.triggerEvent('order.created', { orderId: 'o1' });
    expect(out).toEqual({ event: 'order.created', total: 0, delivered: 0, failed: 0, dead: 0 });
    expect(transport).not.toHaveBeenCalled();
  });

  test('triggerEvent fans out to one webhook and persists a delivery', async () => {
    const wh = await installFakeWebhookModel([
      {
        _id: 'wh_1',
        secret: 'topsecret',
        url: 'https://example.test/hook',
        events: ['order.created', 'order.paid'],
        active: true,
        retryConfig: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 2 },
      },
    ]).items[0];
    installFakeDeliveryModel();
    const transport = okTransport();
    const svc = new WebhookService({ transport });

    const out = await svc.triggerEvent('order.created', { orderId: 'o42' });
    expect(out).toEqual({ event: 'order.created', total: 1, delivered: 1, failed: 0, dead: 0 });
    expect(transport).toHaveBeenCalledTimes(1);
    const [calledUrl, calledPayload, calledOptions] = transport.mock.calls[0];
    expect(calledUrl).toBe('https://example.test/hook');
    expect(calledPayload.event).toBe('order.created');
    expect(calledPayload.payload).toEqual({ orderId: 'o42' });
    expect(calledOptions.headers[EVENT_HEADER]).toBe('order.created');
    expect(calledOptions.headers[SIGNATURE_HEADER]).toMatch(/^sha256=[a-f0-9]{64}$/);
  });

  test('triggerEvent retries on failure then succeeds', async () => {
    installFakeWebhookModel([
      {
        _id: 'wh_2',
        secret: 's',
        url: 'https://example.test/hook',
        events: ['order.paid'],
        active: true,
        retryConfig: { maxAttempts: 5, initialDelayMs: 1, maxDelayMs: 4 },
      },
    ]);
    installFakeDeliveryModel();
    const transport = failingTransport(2); // fail twice, then recover
    const svc = new WebhookService({ transport });
    const out = await svc.triggerEvent('order.paid', { orderId: 'o9' });
    expect(out.delivered).toBe(1);
    expect(out.failed).toBe(0);
    expect(out.dead).toBe(0);
    expect(transport).toHaveBeenCalledTimes(3);
  });

  test('triggerEvent marks delivery dead after maxAttempts', async () => {
    installFakeWebhookModel([
      {
        _id: 'wh_3',
        secret: 's',
        url: 'https://example.test/hook',
        events: ['order.cancelled'],
        active: true,
        retryConfig: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 2 },
      },
    ]);
    installFakeDeliveryModel();
    const transport = alwaysFailTransport();
    const svc = new WebhookService({ transport });
    const out = await svc.triggerEvent('order.cancelled', { orderId: 'o3' });
    expect(out.total).toBe(1);
    expect(out.dead).toBe(1);
    expect(transport).toHaveBeenCalledTimes(3);
  });

  test('triggerEvent with multiple subscribers fans out independently', async () => {
    installFakeWebhookModel([
      {
        _id: 'wh_a',
        secret: 'a',
        url: 'https://a.test/hook',
        events: ['order.created'],
        active: true,
        retryConfig: { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 2 },
      },
      {
        _id: 'wh_b',
        secret: 'b',
        url: 'https://b.test/hook',
        events: ['order.created'],
        active: true,
        retryConfig: { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 2 },
      },
    ]);
    installFakeDeliveryModel();
    const transport = okTransport();
    const svc = new WebhookService({ transport });
    const out = await svc.triggerEvent('order.created', {});
    expect(out.total).toBe(2);
    expect(out.delivered).toBe(2);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  test('triggerEvent skips inactive webhooks', async () => {
    installFakeWebhookModel([
      {
        _id: 'wh_i',
        secret: 's',
        url: 'https://example.test/hook',
        events: ['order.created'],
        active: false,
        retryConfig: { maxAttempts: 1, initialDelayMs: 1, maxDelayMs: 2 },
      },
    ]);
    installFakeDeliveryModel();
    const transport = okTransport();
    const svc = new WebhookService({ transport });
    const out = await svc.triggerEvent('order.created', {});
    expect(out.total).toBe(0);
    expect(transport).not.toHaveBeenCalled();
  });
});
