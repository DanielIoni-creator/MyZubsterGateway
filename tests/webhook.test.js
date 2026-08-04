const express = require('express');
const request = require('supertest');

const createdLogs = [];

jest.mock('../models/WebhookLog', () => ({
  create: jest.fn(async (document) => {
    const log = {
      _id: `log-${createdLogs.length + 1}`,
      ...document,
      toObject() {
        return this;
      },
    };
    createdLogs.push(log);
    return log;
  }),
  find: jest.fn(() => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn(async () => createdLogs),
  })),
}));

const WebhookLog = require('../models/WebhookLog');
const WebhookService = require('../services/webhookService');
const webhookRoutes = require('../routes/webhook');

describe('AI verification webhooks', () => {
  let app;
  const originalSecret = process.env.WEBHOOK_SECRET;

  beforeEach(() => {
    createdLogs.length = 0;
    jest.clearAllMocks();
    process.env.WEBHOOK_SECRET = 'test-secret';

    app = express();
    app.use(express.json());
    app.use('/api/webhook', webhookRoutes);
  });

  afterAll(() => {
    process.env.WEBHOOK_SECRET = originalSecret;
  });

  it('accepts a signed delivery webhook and auto-approves strong evidence', async () => {
    const payload = {
      eventType: 'delivery.completed',
      orderId: 'order-123',
      sellerId: 'seller-9',
      status: 'delivered',
      proof: { url: 'ipfs://proof' },
    };

    const response = await request(app)
      .post('/api/webhook/delivery')
      .set('X-Webhook-Signature', WebhookService.signPayload(payload))
      .send(payload)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('verified');
    expect(response.body.data.verification.status).toBe('auto_approved');
    expect(WebhookLog.create).toHaveBeenCalledWith(expect.objectContaining({
      orderId: 'order-123',
      status: 'verified',
    }));
  });

  it('rejects invalid signatures and stores a rejected log', async () => {
    const payload = {
      orderId: 'order-456',
      status: 'delivered',
      proof: { url: 'ipfs://proof' },
    };

    const response = await request(app)
      .post('/api/webhook/delivery')
      .set('X-Webhook-Signature', 'sha256=bad')
      .send(payload)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(createdLogs[0].status).toBe('rejected');
    expect(createdLogs[0].verification.signals).toContain('invalid_signature');
  });

  it('requires either an orderId or escrowId', async () => {
    const payload = {
      status: 'delivered',
      proof: { url: 'ipfs://proof' },
    };

    const response = await request(app)
      .post('/api/webhook/delivery')
      .set('X-Webhook-Signature', WebhookService.signPayload(payload))
      .send(payload)
      .expect(400);

    expect(response.body.error).toMatch(/orderId or escrowId/);
  });
});
