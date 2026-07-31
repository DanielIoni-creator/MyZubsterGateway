const mongoose = require('mongoose');
const WebhookOutboundService = require('../../services/webhookOutboundService');
const WebhookSubscription = require('../../models/WebhookSubscription');
const WebhookDelivery = require('../../models/WebhookDelivery');

jest.mock('axios');
const mockedAxios = require('axios');

describe('WebhookOutboundService', () => {
  let service;
  let subscription;

  beforeAll(() => {
    mongoose.connect('mongodb://localhost:27017/myzubster-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  beforeEach(() => {
    service = new WebhookOutboundService();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await WebhookSubscription.deleteMany({});
    await WebhookDelivery.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('generateSecret', () => {
    it('generates a 64-character hex string', () => {
      const secret = service.generateSecret();
      expect(secret).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(secret)).toBe(true);
    });

    it('generates unique secrets on each call', () => {
      const s1 = service.generateSecret();
      const s2 = service.generateSecret();
      expect(s1).not.toBe(s2);
    });
  });

  describe('signPayload and verifySignature', () => {
    it('signs a payload with HMAC-SHA256', () => {
      const payload = { orderId: '123', status: 'created' };
      const secret = service.generateSecret();
      const signature = service.signPayload(payload, secret);
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('verifies a valid signature', () => {
      const payload = { orderId: '123' };
      const secret = service.generateSecret();
      const signature = service.signPayload(payload, secret);
      const result = service.verifySignature(payload, signature, secret);
      expect(result.valid).toBe(true);
    });

    it('rejects an invalid signature', () => {
      const payload = { orderId: '123' };
      const secret = service.generateSecret();
      const result = service.verifySignature(payload, 'sha256=invalid', secret);
      expect(result.valid).toBe(false);
    });

    it('returns invalid when signature header is missing', () => {
      const payload = { orderId: '123' };
      const result = service.verifySignature(payload, null, 'secret');
      expect(result.valid).toBe(false);
    });

    it('uses timingSafeEqual for constant-time comparison', () => {
      const payload = { orderId: '123' };
      const secret = service.generateSecret();
      const signature = service.signPayload(payload, secret);
      jest.spyOn(crypto, 'timingSafeEqual');
      service.verifySignature(payload, signature, secret);
      expect(crypto.timingSafeEqual).toHaveBeenCalled();
    });
  });

  describe('exponentialBackoff', () => {
    it('increases delay exponentially', () => {
      const config = { initialDelayMs: 1000, maxDelayMs: 30000 };
      const d0 = service.exponentialBackoff(0, config);
      const d1 = service.exponentialBackoff(1, config);
      const d2 = service.exponentialBackoff(2, config);
      expect(d1).toBeGreaterThan(d0);
      expect(d2).toBeGreaterThan(d1);
    });

    it('caps delay at maxDelayMs', () => {
      const config = { initialDelayMs: 1000, maxDelayMs: 5000 };
      const delay = service.exponentialBackoff(10, config);
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it('includes jitter', () => {
      const config = { initialDelayMs: 1000, maxDelayMs: 60000 };
      const delays = new Set();
      for (let i = 0; i < 50; i++) {
        delays.add(service.exponentialBackoff(0, config));
      }
      expect(delays.size).toBeGreaterThan(1);
    });
  });

  describe('dispatchWebhook', () => {
    beforeEach(async () => {
      subscription = await WebhookSubscription.create({
        url: 'https://example.com/webhook',
        events: ['order.created'],
        active: true,
        secret: 'test-secret',
        retryConfig: { maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 5000 },
      });
    });

    it('creates a pending delivery record', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });
      const result = await service.dispatchWebhook(subscription, 'order.created', { orderId: '1' });
      const delivery = await WebhookDelivery.findById(result.delivery._id);
      expect(delivery.status).toBe('delivered');
      expect(delivery.attempts.length).toBe(1);
    });

    it('sends the correct signature header', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });
      await service.dispatchWebhook(subscription, 'order.created', { orderId: '1' });
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

    it('retries on 5xx errors', async () => {
      mockedAxios.post
        .mockRejectedValueOnce({ response: { status: 500, data: {} } })
        .mockRejectedValueOnce({ response: { status: 500, data: {} } })
        .mockResolvedValueOnce({ status: 200, data: {} });

      jest.useFakeTimers();
      const promise = service.dispatchWebhook(subscription, 'order.created', { orderId: '1' });
      await jest.advanceTimersByTimeAsync(10000);
      const result = await promise;
      jest.useRealTimers();

      expect(result.delivery.attempts.length).toBe(3);
      expect(result.success).toBe(true);
    });

    it('marks delivery as dead after max retries', async () => {
      mockedAxios.post.mockRejectedValue({ response: { status: 500, data: {} } });

      jest.useFakeTimers();
      const promise = service.dispatchWebhook(subscription, 'order.created', { orderId: '1' });
      await jest.advanceTimersByTimeAsync(60000);
      const result = await promise;
      jest.useRealTimers();

      expect(result.success).toBe(false);
      expect(result.delivery.status).toBe('dead');
    });

    it('updates subscription failure count on permanent failure', async () => {
      mockedAxios.post.mockRejectedValue({ response: { status: 500, data: {} } });

      jest.useFakeTimers();
      const promise = service.dispatchWebhook(subscription, 'order.created', { orderId: '1' });
      await jest.advanceTimersByTimeAsync(60000);
      await promise;
      jest.useRealTimers();

      const updated = await WebhookSubscription.findById(subscription._id);
      expect(updated.failureCount).toBe(1);
    });
  });

  describe('triggerEvent', () => {
    it('dispatches to all matching active subscriptions', async () => {
      const sub1 = await WebhookSubscription.create({
        url: 'https://example.com/1',
        events: ['order.created'],
        active: true,
        secret: 's1',
      });
      const sub2 = await WebhookSubscription.create({
        url: 'https://example.com/2',
        events: ['order.created', 'order.updated'],
        active: true,
        secret: 's2',
      });
      const sub3 = await WebhookSubscription.create({
        url: 'https://example.com/3',
        events: ['order.completed'],
        active: true,
        secret: 's3',
      });

      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });

      const results = await service.triggerEvent('order.created', { orderId: '1' });
      expect(results).toHaveLength(2);
      expect(results.map(r => r.subscriptionId.toString())).toContain(sub1._id.toString());
      expect(results.map(r => r.subscriptionId.toString())).toContain(sub2._id.toString());
    });

    it('skips inactive subscriptions', async () => {
      await WebhookSubscription.create({
        url: 'https://example.com/inactive',
        events: ['order.created'],
        active: false,
        secret: 's',
      });

      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });
      const results = await service.triggerEvent('order.created', { orderId: '1' });
      expect(results).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('returns aggregated delivery statistics', async () => {
      await WebhookSubscription.create({
        url: 'https://example.com/1',
        events: ['order.created'],
        active: true,
        secret: 's',
      });

      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });
      await service.triggerEvent('order.created', { orderId: '1' });

      const stats = await service.getStats();
      expect(stats.subscriptions.total).toBe(1);
      expect(stats.deliveries.total).toBe(1);
      expect(stats.deliveries.delivered).toBe(1);
      expect(stats.deliveries.successRate).toBe(100);
    });
  });
});
