// tests/unit/services/webhook.test.js
const crypto = require('crypto');

// Mock mongoose models + axios before requiring the service
jest.mock('axios', () => ({
  post: jest.fn(),
}));
jest.mock('../../../models/Webhook', () => ({
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));
jest.mock('../../../models/WebhookDelivery', () => ({
  create: jest.fn(),
  find: jest.fn(),
}));

const axios = require('axios');
const Webhook = require('../../../models/Webhook');
const WebhookDelivery = require('../../../models/WebhookDelivery');
const svc = require('../../../services/webhookService');

describe('webhookService', () => {
  test('signPayload produces sha256= HMAC signature', () => {
    const secret = 'topsecret';
    const sig = svc.signPayload(secret, '{"a":1}');
    expect(sig.startsWith('sha256=')).toBe(true);
    const expected = crypto.createHmac('sha256', secret).update('{"a":1}').digest('hex');
    expect(sig).toBe('sha256=' + expected);
  });

  test('triggerEvent enqueues a delivery and delivers to matching webhook', async () => {
    const hook = { _id: 'h1', secret: 's', url: 'http://x', retryConfig: { maxAttempts: 5 } };
    Webhook.find.mockResolvedValue([hook]);
    const created = { _id: 'd1', save: jest.fn() };
    WebhookDelivery.create.mockResolvedValue(created);
    axios.post.mockResolvedValue({ status: 200 });

    const results = await svc.triggerEvent('order.created', { id: 1 });
    expect(results).toHaveLength(1);
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post.mock.calls[0][2].headers['X-MyZubster-Signature']).toMatch(/^sha256=/);
    expect(created.status).toBe('delivered');
  });

  test('triggerEvent retries with backoff then marks dead after maxAttempts', async () => {
    jest.useFakeTimers();
    const hook = { _id: 'h2', secret: 's', url: 'http://x', retryConfig: { maxAttempts: 2, initialDelay: 1, maxDelay: 10 } };
    Webhook.find.mockResolvedValue([hook]);
    const created = { _id: 'd2', save: jest.fn() };
    WebhookDelivery.create.mockResolvedValue(created);
    axios.post.mockRejectedValue(new Error('network down'));

    const results = await svc.triggerEvent('order.created', { id: 2 });
    // first attempt fails synchronously; retry scheduled via setTimeout
    expect(results[0].status).toBe('failed');
    // advance timers to fire the retry (which also fails -> dead)
    await jest.runOnlyPendingTimersAsync();
    expect(created.status).toBe('dead');
    jest.useRealTimers();
  });

  test('createWebhook delegates to model', async () => {
    const made = { _id: 'h3', name: 'wh' };
    Webhook.create.mockResolvedValue(made);
    const r = await svc.createWebhook({ name: 'wh', url: 'http://u', events: ['order.created'] });
    expect(Webhook.create).toHaveBeenCalled();
    expect(r._id).toBe('h3');
  });
});
