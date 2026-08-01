const mongoose = require('mongoose');
const crypto = require('crypto');
const WebhookOutboundService = require('../../services/webhookOutboundService');

// Mock dei modelli
jest.mock('../../models/WebhookSubscription', () => ({
  create: jest.fn().mockResolvedValue({
    _id: 'mock-subscription-id',
    url: 'https://example.com/webhook',
    events: ['order.created'],
    active: true,
    secret: 'mock-secret'
  }),
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  save: jest.fn().mockResolvedValue({})
}));

jest.mock('../../models/WebhookDelivery', () => ({
  create: jest.fn().mockResolvedValue({
    _id: 'mock-delivery-id',
    status: 'pending'
  }),
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  save: jest.fn().mockResolvedValue({})
}));

jest.mock('axios');

describe('WebhookOutboundService', () => {
  let service;

  beforeAll(() => {
    service = new WebhookOutboundService();
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
      const config = { initialDelayMs: 1000, maxDelayMs: 30000 };
      const delays = new Set();
      for (let i = 0; i < 50; i++) {
        delays.add(service.exponentialBackoff(0, config));
      }
      expect(delays.size).toBeGreaterThan(1);
    });
  });

  describe('dispatchWebhook', () => {
    it('creates a pending delivery record', async () => {
      const subscription = {
        _id: 'mock-id',
        url: 'https://example.com/webhook',
        events: ['order.created'],
        active: true,
        secret: 'mock-secret'
      };
      const result = await service.dispatchWebhook(subscription, { event: 'order.created' });
      expect(result).toBeDefined();
    });
  });

  describe('triggerEvent', () => {
    it('dispatches to all matching active subscriptions', async () => {
      const result = await service.triggerEvent('order.created', { id: '123' });
      expect(result).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('returns aggregated delivery statistics', async () => {
      const stats = await service.getStats();
      expect(stats).toHaveProperty('totalDeliveries');
      expect(stats).toHaveProperty('successful');
      expect(stats).toHaveProperty('failed');
    });
  });
});
