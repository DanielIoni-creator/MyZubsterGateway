const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('Escrow AI Agent', () => {
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/escrow-ai/webhook/order-status', () => {
    it('should reject missing orderId', async () => {
      const res = await request(app)
        .post('/api/escrow-ai/webhook/order-status')
        .set('Authorization', 'Bearer test-token')
        .send({ status: 'completed' });
      expect(res.status).toBe(400);
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .post('/api/escrow-ai/webhook/order-status')
        .set('Authorization', 'Bearer test-token')
        .send({ orderId: new mongoose.Types.ObjectId(), status: 'completed' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/escrow-ai/decisions/:orderId', () => {
    it('should return empty array for order with no decisions', async () => {
      const res = await request(app)
        .get(`/api/escrow-ai/decisions/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', 'Bearer test-token');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });
});
