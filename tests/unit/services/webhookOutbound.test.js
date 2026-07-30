const mongoose = require('mongoose');
const crypto = require('crypto');
const WebhookOutboundService = require('../../../services/webhookOutboundService');
const WebhookSubscription = require('../../../models/WebhookSubscription');
const WebhookDelivery = require('../../../models/WebhookDelivery');

jest.mock('axios');
const mockedAxios = require('axios');

/* ================================================================
   These tests use mocked axios so no real HTTP calls are made.
   Models are real Mongoose models connected to the test DB.
   ================================================================ */

describe('WebhookOutboundService', () => {
  beforeAll(async () => {
    // Use a separate test DB — the MONGO_URI is set via jest setup
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/myzubster-test';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await WebhookSubscription.deleteMany({});
    await WebhookDelivery.deleteMany({});
  });

  /* ─────────── generateSecret ─────────── */
  describe('generateSecret', () => {
    it('generates a 64-character hex string', () => {
      const secret = WebhookOutboundService.generateSecret();
      expect(secret).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(secret)).toBe(true);
    });

    it('generates unique secrets on each call', () => {
      const s1 = WebhookOutboundService.generateSecret();
      const s2 = WebhookOutboundService.generateSecret();
      expect(s1).not.toBe(s2);
    });
  });

  /* ─────────── signPayload & verifySignature ─────────── */
  describe('signPayload', () => {
    it('signs a payload with HMAC-SHA256 returning sha256=<hex>', () => {
      const payload = { orderId: '123', status: 'created' };
      const secret = WebhookOutboundService.generateSecret();
      const signature = WebhookOutboundService.signPayload(payload, secret);
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('produces deterministic signatures with stable key ordering', () => {
      const secret = 'test-secret';
      const a = WebhookOutboundService.signPayload({ b: 1, a: 2 }, secret);
      const b = WebhookOutboundService.signPayload({ a: 2, b: 1 }, secret);
      expect(a).toBe(b);
    });

    it('handles nested objects with stable stringify', () => {
      const secret = 'test-secret';
      const s1 = WebhookOutboundService.signPayload({ data: { z: 1, a: 2 }, id: 5 }, secret);
      const s2 = WebhookOutboundService.signPayload({ id: 5, data: { a: 2, z: 1 } }, secret);
      expect(s1).toBe(s2);
    });

    it('handles arrays and primitive values', () => {
      const secret = 's';
      expect(WebhookOutboundService.signPayload({ items: [3, 1, 2] }, secret)).toMatch(/^sha256=/);
      expect(WebhookOutboundService.signPayload('string', secret)).toMatch(/^sha256=/);
      expect(WebhookOutboundService.signPayload(42, secret)).toMatch(/^sha256=/);
    });

    it('throws when secret is missing', () => {
      expect(() => WebhookOutboundService.signPayload({ a: 1 }, null)).toThrow('secret is required');
      expect(() => WebhookOutboundService.signPayload({ a: 1 }, '')).toThrow('secret is required');
    });
  });

  describe('verifySignature', () => {
    it('returns valid for a correct signature', () => {
      const payload = { event: 'test' };
      const secret = 'my-secret';
      const sig = WebhookOutboundService.signPayload(payload, secret);
      const result = WebhookOutboundService.verifySignature(payload, sig, secret);
      expect(result.valid).toBe(true);
    });

    it('rejects an incorrect signature', () => {
      const payload = { event: 'test' };
      const result = WebhookOutboundService.verifySignature(payload, 'sha256=INVALID', 'my-secret');
      expect(result.valid).toBe(false);
    });

    it('returns invalid when signature header is missing', () => {
      const result = WebhookOutboundService.verifySignature({}, null, 'secret');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Missing');
    });

    it('detects length mismatch', () => {
      const result = WebhookOutboundService.verifySignature({}, 'short', 'secret');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('length mismatch');
    });

    it('uses timingSafeEqual for constant-time comparison', () => {
      const payload = { a: 1 };
      const secret = 'secret';
      const sig = WebhookOutboundService.signPayload(payload, secret);
      const spy = jest.spyOn(crypto, 'timingSafeEqual');
      WebhookOutboundService.verifySignature(payload, sig, secret);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  /* ─────────── exponentialBackoff ─────────── */
  describe('exponentialBackoff', () => {
    it('increases delay exponentially with attempt count', () => {
      const config = { initialDelayMs: 1000, maxDelayMs: 30000 };
      const d0 = WebhookOutboundService.exponentialBackoff(0, config);
      const d1 = WebhookOutboundService.exponentialBackoff(1, config);
      const d2 = WebhookOutboundService.exponentialBackoff(2, config);
      expect(d1).toBeGreaterThan(d0);
      expect(d2).toBeGreaterThan(d1);
    });

    it('caps delay at maxDelayMs', () => {
      const config = { initialDelayMs: 1000, maxDelayMs: 5000 };
      const delay = WebhookOutboundService.exponentialBackoff(10, config);
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it('includes jitter (produces varying delays)', () => {
      const config = { initialDelayMs: 5000, maxDelayMs: 60000 };
      const delays = new Set();
      for (let i = 0; i < 30; i++) delays.add(WebhookOutboundService.exponentialBackoff(0, config));
      expect(delays.size).toBeGreaterThan(1);
    });

    it('uses defaults when config is empty', () => {
      const delay = WebhookOutboundService.exponentialBackoff(0, {});
      expect(delay).toBeGreaterThanOrEqual(1000);
    });
  });

  /* ─────────── dispatchWebhook ─────────── */
  describe('dispatchWebhook', () => {
    let subscription;

    beforeEach(async () => {
      subscription = await WebhookSubscription.create({
        url: 'https://example.com/webhook',
        events: ['order.created'],
        active: true,
        secret: 'test-secret',
        retryConfig: { maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 5000 },
      });
    });

    it('creates a pending delivery and delivers successfully', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });
      const result = await WebhookOutboundService.dispatchWebhook(subscription, 'order.created', { orderId: '1' });
      expect(result.success).toBe(true);
      expect(result.delivery.status).toBe('delivered');
      expect(result.delivery.attempts.length).toBe(1);
    });

    it('sends the correct HMAC-SHA256 signature header', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });
      await WebhookOutboundService.dispatchWebhook(subscription, 'order.created', { orderId: '1' });
      expect(mockedAxios.post).toHaveBeenCalledWith(
        subscription.url,
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Webhook-Signature': expect.stringMatching(/^sha256=/),
          }),
        })
      );
    });

    it('retries on 5xx errors and can succeed on later attempt', async () => {
      mockedAxios.post
        .mockRejectedValueOnce({ response: { status: 500, data: {} } })
        .mockRejectedValueOnce({ response: { status: 502, data: {} } })
        .mockResolvedValueOnce({ status: 200, data: {} });

      // Reduce delays for test speed
      subscription.retryConfig.initialDelayMs = 10;
      subscription.retryConfig.maxDelayMs = 100;
      await subscription.save();

      const result = await WebhookOutboundService.dispatchWebhook(subscription, 'order.created', { orderId: '1' });
      expect(result.success).toBe(true);
      expect(result.delivery.attempts.length).toBe(3);
    }, 15000);

    it('marks delivery as dead after exhausting max retries', async () => {
      mockedAxios.post.mockRejectedValue({ response: { status: 500, data: {} } });

      subscription.retryConfig.initialDelayMs = 10;
      subscription.retryConfig.maxDelayMs = 100;
      await subscription.save();

      const result = await WebhookOutboundService.dispatchWebhook(subscription, 'order.created', { orderId: '1' });
      expect(result.success).toBe(false);
      expect(result.delivery.status).toBe('dead');
      expect(result.delivery.attempts.length).toBe(3);
    }, 15000);

    it('tracks each attempt with timestamp, statusCode, and durationMs', async () => {
      mockedAxios.post
        .mockRejectedValueOnce({ response: { status: 500, data: 'err' } })
        .mockResolvedValueOnce({ status: 200, data: 'ok' });

      subscription.retryConfig.initialDelayMs = 10;
      subscription.retryConfig.maxDelayMs = 100;
      await subscription.save();

      const result = await WebhookOutboundService.dispatchWebhook(subscription, 'order.created', { orderId: '1' });
      expect(result.delivery.attempts[0].timestamp).toBeDefined();
      expect(result.delivery.attempts[0].statusCode).toBe(500);
      expect(result.delivery.attempts[0].durationMs).toBeGreaterThanOrEqual(0);
      expect(result.delivery.attempts[1].statusCode).toBe(200);
    }, 15000);

    it('handles network errors (no response) gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));
      subscription.retryConfig.maxAttempts = 1;
      subscription.retryConfig.initialDelayMs = 10;
      await subscription.save();

      const result = await WebhookOutboundService.dispatchWebhook(subscription, 'order.created', {});
      expect(result.success).toBe(false);
      expect(result.delivery.attempts[0].error).toContain('ECONNREFUSED');
    }, 10000);

    it('updates subscription failureCount on permanent failure', async () => {
      mockedAxios.post.mockRejectedValue({ response: { status: 500, data: {} } });
      subscription.retryConfig.maxAttempts = 1;
      subscription.retryConfig.initialDelayMs = 10;
      await subscription.save();

      await WebhookOutboundService.dispatchWebhook(subscription, 'order.created', {});
      const updated = await WebhookSubscription.findById(subscription._id);
      expect(updated.failureCount).toBe(1);
    }, 10000);

    it('resets failureCount to 0 on successful delivery', async () => {
      subscription.failureCount = 3;
      await subscription.save();

      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });
      await WebhookOutboundService.dispatchWebhook(subscription, 'order.created', { id: 1 });

      const updated = await WebhookSubscription.findById(subscription._id);
      expect(updated.failureCount).toBe(0);
    });
  });

  /* ─────────── triggerEvent ─────────── */
  describe('triggerEvent', () => {
    it('dispatches to all matching active subscriptions', async () => {
      const sub1 = await WebhookSubscription.create({
        url: 'https://a.example.com', events: ['order.created'], secret: 's1', active: true,
      });
      const sub2 = await WebhookSubscription.create({
        url: 'https://b.example.com', events: ['order.created', 'order.updated'], secret: 's2', active: true,
      });
      await WebhookSubscription.create({
        url: 'https://c.example.com', events: ['order.completed'], secret: 's3', active: true,
      });

      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });

      const results = await WebhookOutboundService.triggerEvent('order.created', { orderId: '1' });
      expect(results).toHaveLength(2);
      const ids = results.map(r => r.subscriptionId.toString());
      expect(ids).toContain(sub1._id.toString());
      expect(ids).toContain(sub2._id.toString());
    });

    it('skips inactive subscriptions', async () => {
      await WebhookSubscription.create({
        url: 'https://x.example.com', events: ['order.created'], secret: 's', active: false,
      });
      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });
      const results = await WebhookOutboundService.triggerEvent('order.created', {});
      expect(results).toHaveLength(0);
    });

    it('honours eventTypes option', async () => {
      await WebhookSubscription.create({
        url: 'https://x.example.com', events: ['order.shipped'], secret: 's', active: true,
      });
      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });
      const results = await WebhookOutboundService.triggerEvent('order.shipped', {}, { eventTypes: ['order.shipped'] });
      expect(results).toHaveLength(1);
    });
  });

  /* ─────────── retryDelivery ─────────── */
  describe('retryDelivery', () => {
    it('retries a failed delivery successfully', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/hook', events: ['test'], secret: 's', active: true,
        retryConfig: { maxAttempts: 3, initialDelayMs: 1000, maxDelayMs: 5000 },
      });
      const delivery = await WebhookDelivery.create({
        subscriptionId: sub._id, event: 'test', payload: {}, status: 'dead', attempts: [
          { timestamp: new Date(), statusCode: 500, error: 'Server Error', durationMs: 100 },
        ],
      });

      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });
      const result = await WebhookOutboundService.retryDelivery(delivery._id);
      expect(result.success).toBe(true);
      expect(result.delivery.status).toBe('delivered');
    }, 10000);

    it('throws on already-delivered delivery', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com', events: ['test'], secret: 's', active: true,
      });
      const delivery = await WebhookDelivery.create({
        subscriptionId: sub._id, event: 'test', payload: {}, status: 'delivered',
      });
      await expect(WebhookOutboundService.retryDelivery(delivery._id)).rejects.toThrow('already delivered');
    });

    it('throws when subscription is inactive', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com', events: ['test'], secret: 's', active: false,
      });
      const delivery = await WebhookDelivery.create({
        subscriptionId: sub._id, event: 'test', payload: {}, status: 'dead',
      });
      await expect(WebhookOutboundService.retryDelivery(delivery._id)).rejects.toThrow('inactive');
    });
  });

  /* ─────────── getStats ─────────── */
  describe('getStats', () => {
    it('returns aggregated statistics with zero values when empty', async () => {
      const stats = await WebhookOutboundService.getStats();
      expect(stats.subscriptions.total).toBe(0);
      expect(stats.deliveries.total).toBe(0);
    });

    it('reflects created subscriptions and deliveries', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com', events: ['e'], secret: 's', active: true,
      });
      await WebhookDelivery.create({
        subscriptionId: sub._id, event: 'e', payload: {}, status: 'delivered', attempts: [{ timestamp: new Date(), statusCode: 200, durationMs: 50 }],
      });

      const stats = await WebhookOutboundService.getStats();
      expect(stats.subscriptions.total).toBe(1);
      expect(stats.subscriptions.active).toBe(1);
      expect(stats.deliveries.total).toBe(1);
      expect(stats.deliveries.delivered).toBe(1);
      expect(stats.deliveries.successRate).toBe(100);
    });
  });

  /* ─────────── listDeliveries & getDelivery ─────────── */
  describe('listDeliveries / getDelivery', () => {
    it('lists deliveries with pagination', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com', events: ['e'], secret: 's', active: true,
      });
      await WebhookDelivery.create([
        { subscriptionId: sub._id, event: 'e1', payload: {}, status: 'delivered' },
        { subscriptionId: sub._id, event: 'e2', payload: {}, status: 'dead' },
      ]);

      const result = await WebhookOutboundService.listDeliveries({}, 1, 10);
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters deliveries by status', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com', events: ['e'], secret: 's', active: true,
      });
      await WebhookDelivery.create([
        { subscriptionId: sub._id, event: 'e', payload: {}, status: 'delivered' },
        { subscriptionId: sub._id, event: 'e', payload: {}, status: 'dead' },
      ]);

      const result = await WebhookOutboundService.listDeliveries({ status: 'delivered' }, 1, 10);
      expect(result.data).toHaveLength(1);
    });

    it('getDelivery returns a populated delivery', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com', events: ['e'], secret: 's', active: true,
      });
      const d = await WebhookDelivery.create({
        subscriptionId: sub._id, event: 'e', payload: { x: 1 }, status: 'delivered',
      });
      const fetched = await WebhookOutboundService.getDelivery(d._id);
      expect(fetched._id.toString()).toBe(d._id.toString());
      expect(fetched.subscriptionId).toBeTruthy();
    });

    it('getDelivery throws on missing delivery', async () => {
      const id = new mongoose.Types.ObjectId();
      await expect(WebhookOutboundService.getDelivery(id)).rejects.toThrow('not found');
    });
  });
});
