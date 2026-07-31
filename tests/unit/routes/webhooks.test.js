const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const WebhookOutboundService = require('../../services/webhookOutboundService');
const WebhookSubscription = require('../../models/WebhookSubscription');
const WebhookDelivery = require('../../models/WebhookDelivery');
const webhookRoutes = require('../../routes/webhooks');

jest.mock('axios');
const mockedAxios = require('axios');

describe('Webhook Routes', () => {
  let app;

  beforeAll(() => {
    mongoose.connect('mongodb://localhost:27017/myzubster-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
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

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/webhooks', () => {
    it('creates a webhook subscription', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://example.com/webhook',
          events: ['order.created'],
          description: 'Test webhook',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBe('https://example.com/webhook');
      expect(res.body.data.events).toEqual(['order.created']);
      expect(res.body.data.secret).toBeDefined();
      expect(res.body.data.secret).toHaveLength(64);
    });

    it('validates URL format', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .send({
          url: 'not-a-url',
          events: ['order.created'],
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Invalid webhook URL/);
    });

    it('requires at least one event', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://example.com/webhook',
          events: [],
        })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('applies default retry config', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .send({
          url: 'https://example.com/webhook',
          events: ['order.created'],
        })
        .expect(201);

      expect(res.body.data.retryConfig.maxAttempts).toBe(5);
      expect(res.body.data.retryConfig.initialDelayMs).toBe(5000);
    });
  });

  describe('GET /api/webhooks', () => {
    it('lists webhook subscriptions with pagination', async () => {
      await WebhookSubscription.create([
        { url: 'https://example.com/1', events: ['order.created'], secret: 's1', active: true },
        { url: 'https://example.com/2', events: ['order.updated'], secret: 's2', active: false },
      ]);

      const res = await request(app)
        .get('/api/webhooks?page=1&limit=10')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.pages).toBe(1);
    });

    it('filters by active status', async () => {
      await WebhookSubscription.create([
        { url: 'https://example.com/1', events: ['order.created'], secret: 's1', active: true },
        { url: 'https://example.com/2', events: ['order.updated'], secret: 's2', active: false },
      ]);

      const res = await request(app)
        .get('/api/webhooks?active=true')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].active).toBe(true);
    });
  });

  describe('GET /api/webhooks/:id', () => {
    it('returns a single subscription', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
      });

      const res = await request(app)
        .get(`/api/webhooks/${sub._id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(sub._id.toString());
    });

    it('returns 404 for missing subscription', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/webhooks/${fakeId}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('PATCH /api/webhooks/:id', () => {
    it('updates subscription fields', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
      });

      const res = await request(app)
        .patch(`/api/webhooks/${sub._id}`)
        .send({ active: false, description: 'Updated' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.active).toBe(false);
      expect(res.body.data.description).toBe('Updated');
    });
  });

  describe('DELETE /api/webhooks/:id', () => {
    it('deletes a subscription and its deliveries', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
      });
      await WebhookDelivery.create({
        subscriptionId: sub._id,
        event: 'order.created',
        payload: {},
        status: 'delivered',
      });

      const res = await request(app)
        .delete(`/api/webhooks/${sub._id}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const subCount = await WebhookSubscription.countDocuments({ _id: sub._id });
      const deliveryCount = await WebhookDelivery.countDocuments({ subscriptionId: sub._id });
      expect(subCount).toBe(0);
      expect(deliveryCount).toBe(0);
    });
  });

  describe('POST /api/webhooks/:id/test', () => {
    it('sends a test webhook', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
        active: true,
      });

      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });

      const res = await request(app)
        .post(`/api/webhooks/${sub._id}/test`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.result.delivered).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalled();
    });

    it('returns 404 for missing subscription', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/webhooks/${fakeId}/test`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/webhooks/deliveries', () => {
    it('lists deliveries with pagination', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
      });

      await WebhookDelivery.create([
        { subscriptionId: sub._id, event: 'order.created', payload: {}, status: 'delivered' },
        { subscriptionId: sub._id, event: 'order.created', payload: {}, status: 'failed' },
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
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
      });

      await WebhookDelivery.create([
        { subscriptionId: sub._id, event: 'order.created', payload: {}, status: 'delivered' },
        { subscriptionId: sub._id, event: 'order.created', payload: {}, status: 'failed' },
      ]);

      const res = await request(app)
        .get('/api/webhooks/deliveries?status=delivered')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].status).toBe('delivered');
    });
  });

  describe('GET /api/webhooks/stats/overview', () => {
    it('returns webhook statistics', async () => {
      const sub = await WebhookSubscription.create({
        url: 'https://example.com/webhook',
        events: ['order.created'],
        secret: 'secret',
        active: true,
      });

      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });
      await WebhookOutboundService.dispatchWebhook(sub, 'order.created', { orderId: '1' });

      const res = await request(app)
        .get('/api/webhooks/stats/overview')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.subscriptions.total).toBe(1);
      expect(res.body.data.deliveries.delivered).toBe(1);
    });
  });
});
