const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const WebhookOutboundService = require('../../../services/webhookOutboundService');
const WebhookSubscription = require('../../../models/WebhookSubscription');
const WebhookDelivery = require('../../../models/WebhookDelivery');
const webhookRoutes = require('../../../routes/webhooks');

jest.mock('axios');
const mockedAxios = require('axios');

describe('Webhook Routes', () => {
  let app;

  beforeAll(async () => {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/myzubster-test';
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/webhooks', webhookRoutes);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await WebhookSubscription.deleteMany({});
    await WebhookDelivery.deleteMany({});
  });

  /* ───── POST /api/webhooks ───── */
  describe('POST /api/webhooks', () => {
    it('creates a webhook subscription', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .send({ url: 'https://example.com/webhook', events: ['order.created'], description: 'Test' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBe('https://example.com/webhook');
      expect(res.body.data.events).toEqual(['order.created']);
      expect(res.body.data.secret).toBeDefined();
      expect(res.body.data.secret).toHaveLength(64);
    });

    it('validates URL format via Joi', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .send({ url: 'not-a-valid-url', events: ['order.created'] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('requires at least one event', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .send({ url: 'https://example.com/hook', events: [] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('applies default retry config', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .send({ url: 'https://example.com/hook', events: ['order.created'] })
        .expect(201);

      expect(res.body.data.retryConfig.maxAttempts).toBe(5);
      expect(res.body.data.retryConfig.initialDelayMs).toBe(5000);
    });
  });

  /* ───── GET /api/webhooks ───── */
  describe('GET /api/webhooks', () => {
    it('lists subscriptions with pagination', async () => {
      await WebhookSubscription.create([
        { url: 'https://a.example.com', events: ['e1'], secret: 's1', active: true },
        { url: 'https://b.example.com', events: ['e2'], secret: 's2', active: false },
      ]);

      const res = await request(app).get('/api/webhooks?page=1&limit=10').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('filters by active status', async () => {
      await WebhookSubscription.create([
        { url: 'https://a.example.com', events: ['e1'], secret: 's1', active: true },
        { url: 'https://b.example.com', events: ['e2'], secret: 's2', active: false },
      ]);

      const res = await request(app).get('/api/webhooks?active=true').expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].active).toBe(true);
    });

    it('filters by event type', async () => {
      await WebhookSubscription.create([
        { url: 'https://a.example.com', events: ['order.created'], secret: 's1', active: true },
        { url: 'https://b.example.com', events: ['user.registered'], secret: 's2', active: true },
      ]);

      const res = await request(app).get('/api/webhooks?event=order.created').expect(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  /* ───── GET /api/webhooks/:id ───── */
  describe('GET /api/webhooks/:id', () => {
    it('returns a single subscription with secret', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/hook', events: ['e'], secret: 'my-secret',
      });
      const res = await request(app).get(`/api/webhooks/${sub._id}`).expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.secret).toBe('my-secret');
    });

    it('returns 404 for missing subscription', async () => {
      const id = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/webhooks/${id}`).expect(404);
      expect(res.body.success).toBe(false);
    });
  });

  /* ───── PATCH /api/webhooks/:id ───── */
  describe('PATCH /api/webhooks/:id', () => {
    it('updates subscription fields', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/hook', events: ['e'], secret: 's', active: true,
      });
      const res = await request(app)
        .patch(`/api/webhooks/${sub._id}`)
        .send({ active: false, description: 'Updated' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.active).toBe(false);
      expect(res.body.data.description).toBe('Updated');
    });

    it('rejects empty patch body', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/hook', events: ['e'], secret: 's',
      });
      const res = await request(app)
        .patch(`/api/webhooks/${sub._id}`)
        .send({})
        .expect(400);
      expect(res.body.success).toBe(false);
    });
  });

  /* ───── DELETE /api/webhooks/:id ───── */
  describe('DELETE /api/webhooks/:id', () => {
    it('deletes a subscription and its deliveries', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/hook', events: ['e'], secret: 's',
      });
      await WebhookDelivery.create({
        subscriptionId: sub._id, event: 'e', payload: {}, status: 'delivered',
      });

      const res = await request(app).delete(`/api/webhooks/${sub._id}`).expect(200);
      expect(res.body.success).toBe(true);

      const subCount = await WebhookSubscription.countDocuments({ _id: sub._id });
      expect(subCount).toBe(0);
    });
  });

  /* ───── POST /api/webhooks/:id/regenerate-secret ───── */
  describe('POST /api/webhooks/:id/regenerate-secret', () => {
    it('regenerates the secret', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/hook', events: ['e'], secret: 'old-secret',
      });
      const res = await request(app)
        .post(`/api/webhooks/${sub._id}/regenerate-secret`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.secret).toHaveLength(64);
      expect(res.body.data.secret).not.toBe('old-secret');
    });
  });

  /* ───── POST /api/webhooks/:id/test ───── */
  describe('POST /api/webhooks/:id/test', () => {
    it('sends a test webhook', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/hook', events: ['e'], secret: 's', active: true,
      });
      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });

      const res = await request(app)
        .post(`/api/webhooks/${sub._id}/test`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.result.delivered).toBe(true);
    });

    it('returns 404 for missing subscription', async () => {
      const id = new mongoose.Types.ObjectId();
      const res = await request(app).post(`/api/webhooks/${id}/test`).expect(404);
      expect(res.body.success).toBe(false);
    });
  });

  /* ───── POST /api/webhooks/test (standalone) ───── */
  describe('POST /api/webhooks/test (standalone)', () => {
    it('sends a test webhook to an arbitrary URL', async () => {
      mockedAxios.post.mockResolvedValue({ status: 200, data: 'OK' });
      const res = await request(app)
        .post('/api/webhooks/test')
        .send({ url: 'https://example.com/test-hook' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.statusCode).toBe(200);
      expect(res.body.data.success).toBe(true);
    });

    it('returns 400 when URL is missing', async () => {
      const res = await request(app)
        .post('/api/webhooks/test')
        .send({})
        .expect(400);
      expect(res.body.success).toBe(false);
    });
  });

  /* ───── GET /api/webhooks/deliveries ───── */
  describe('GET /api/webhooks/deliveries', () => {
    it('lists deliveries with pagination', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com', events: ['e'], secret: 's',
      });
      await WebhookDelivery.create([
        { subscriptionId: sub._id, event: 'e1', payload: {}, status: 'delivered' },
        { subscriptionId: sub._id, event: 'e2', payload: {}, status: 'dead' },
      ]);

      const res = await request(app)
        .get('/api/webhooks/deliveries?page=1&limit=10')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('filters by status', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com', events: ['e'], secret: 's',
      });
      await WebhookDelivery.create([
        { subscriptionId: sub._id, event: 'e', payload: {}, status: 'delivered' },
        { subscriptionId: sub._id, event: 'e', payload: {}, status: 'dead' },
      ]);

      const res = await request(app)
        .get('/api/webhooks/deliveries?status=delivered')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('delivered');
    });
  });

  /* ───── GET /api/webhooks/deliveries/:id ───── */
  describe('GET /api/webhooks/deliveries/:id', () => {
    it('returns a single delivery', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com', events: ['e'], secret: 's',
      });
      const d = await WebhookDelivery.create({
        subscriptionId: sub._id, event: 'e', payload: { x: 1 }, status: 'delivered',
      });

      const res = await request(app)
        .get(`/api/webhooks/deliveries/${d._id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.event).toBe('e');
    });
  });

  /* ───── POST /api/webhooks/deliveries/:id/retry ───── */
  describe('POST /api/webhooks/deliveries/:id/retry', () => {
    it('retries a failed delivery', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com', events: ['e'], secret: 's', active: true,
        retryConfig: { maxAttempts: 1, initialDelayMs: 1000, maxDelayMs: 1000 },
      });
      const d = await WebhookDelivery.create({
        subscriptionId: sub._id, event: 'e', payload: {}, status: 'dead',
        attempts: [{ timestamp: new Date(), statusCode: 500, error: 'err' }],
      });

      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });

      const res = await request(app)
        .post(`/api/webhooks/deliveries/${d._id}/retry`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
    }, 10000);
  });

  /* ───── GET /api/webhooks/stats/overview ───── */
  describe('GET /api/webhooks/stats/overview', () => {
    it('returns webhook statistics', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com', events: ['e'], secret: 's', active: true,
      });
      await WebhookDelivery.create({
        subscriptionId: sub._id, event: 'e', payload: {}, status: 'delivered',
        attempts: [{ timestamp: new Date(), statusCode: 200, durationMs: 50 }],
      });

      const res = await request(app)
        .get('/api/webhooks/stats/overview')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.subscriptions.total).toBe(1);
      expect(res.body.data.deliveries.delivered).toBe(1);
    });
  });
});
