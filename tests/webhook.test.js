// tests/webhook.test.js
const request = require('supertest');
const app = require('../server');
const jwtService = require('../services/jwtService');
const webhookService = require('../services/webhookService');

describe('Webhook System for Order Events (#21)', () => {
  let adminToken;
  let userToken;
  let createdWebhookId;

  beforeAll(() => {
    adminToken = jwtService.generateToken({
      userId: '507f1f77bcf86cd799439099',
      email: 'admin@myzubster.com',
      role: 'admin'
    });

    userToken = jwtService.generateToken({
      userId: '507f1f77bcf86cd799439011',
      email: 'user@myzubster.com',
      role: 'user'
    });
  });

  describe('HMAC-SHA256 Signature Generation', () => {
    test('generates deterministic HMAC signature', () => {
      const payload = { event: 'order.created', data: { orderId: '123' } };
      const secret = 'super-secret-key';
      const sig1 = webhookService.generateSignature(payload, secret);
      const sig2 = webhookService.generateSignature(payload, secret);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // SHA256 hex string length
    });
  });

  describe('Webhook Management API', () => {
    test('POST /api/admin/webhooks rejects non-admin users', async () => {
      const res = await request(app)
        .post('/api/admin/webhooks')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          url: 'https://example.com/webhook',
          events: ['order.created']
        });
      expect(res.statusCode).toBe(403);
    });

    test('POST /api/admin/webhooks creates new webhook for admin', async () => {
      const res = await request(app)
        .post('/api/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          url: 'https://example.com/webhook-listener',
          events: ['order.created', 'order.payment-received']
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toBe('https://example.com/webhook-listener');
      expect(res.body.data.secret).toBeDefined();
      createdWebhookId = res.body.data._id;
    });

    test('GET /api/admin/webhooks lists all webhooks', async () => {
      const res = await request(app)
        .get('/api/admin/webhooks')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    test('PUT /api/admin/webhooks/:id updates webhook', async () => {
      const res = await request(app)
        .put(`/api/admin/webhooks/${createdWebhookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          events: ['order.completed', 'order.cancelled']
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.events).toEqual(['order.completed', 'order.cancelled']);
    });

    test('DELETE /api/admin/webhooks/:id deletes webhook', async () => {
      const res = await request(app)
        .delete(`/api/admin/webhooks/${createdWebhookId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });
});
