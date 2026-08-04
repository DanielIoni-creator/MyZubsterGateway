const express = require('express');
const request = require('supertest');

const createdLogs = [];

jest.mock('../models/ActivityLog', () => ({
  create: jest.fn(async (document) => {
    const log = {
      _id: `activity-${createdLogs.length + 1}`,
      ...document,
    };
    createdLogs.push(log);
    return log;
  }),
  find: jest.fn(() => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn(async () => createdLogs),
  })),
}));

const ActivityLog = require('../models/ActivityLog');
const ActivityLogService = require('../services/activityLogService');

describe('Activity logging', () => {
  beforeEach(() => {
    createdLogs.length = 0;
    jest.clearAllMocks();
  });

  it('classifies login, order, payment, and webhook requests', () => {
    expect(ActivityLogService.classifyRequest({
      method: 'POST',
      originalUrl: '/api/auth/login',
    }).action).toBe('login');

    expect(ActivityLogService.classifyRequest({
      method: 'POST',
      originalUrl: '/api/orders',
    }).action).toBe('order_creation');

    expect(ActivityLogService.classifyRequest({
      method: 'POST',
      originalUrl: '/api/monero/generate-subaddress',
    }).action).toBe('payment_initiation');

    expect(ActivityLogService.classifyRequest({
      method: 'POST',
      originalUrl: '/api/webhook/delivery',
    }).action).toBe('webhook_event');
  });

  it('redacts sensitive metadata before writing logs', async () => {
    await ActivityLogService.recordActivity({
      action: 'login',
      metadata: {
        email: 'user@example.com',
        password: 'secret',
        nested: { token: 'jwt' },
      },
    });

    expect(createdLogs[0].metadata.password).toBe('[Redacted]');
    expect(createdLogs[0].metadata.nested.token).toBe('[Redacted]');
  });

  it('records key requests without blocking the response', async () => {
    const app = express();
    app.use(express.json());
    app.use(ActivityLogService.activityLogger());
    app.post('/api/auth/login', (req, res) => {
      res.json({ success: true, user: { id: '64b000000000000000000001' } });
    });

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'secret' })
      .expect(200);

    await new Promise((resolve) => setImmediate(resolve));

    expect(ActivityLog.create).toHaveBeenCalledWith(expect.objectContaining({
      action: 'login',
      path: '/api/auth/login',
      statusCode: 200,
    }));
    expect(createdLogs[0].metadata.body.password).toBe('[Redacted]');
  });
});
