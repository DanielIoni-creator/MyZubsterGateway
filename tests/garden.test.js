const express = require('express');
const request = require('supertest');

const USER_ID = '000000000000000000000123';

// --------------------------------------------------------------------------
// Mock auth — passes through if Bearer garden-token is set
// --------------------------------------------------------------------------
jest.mock('../middleware/auth', () => (req, res, next) => {
  if (req.get('Authorization') !== 'Bearer garden-token') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = { _id: USER_ID, id: USER_ID };
  return next();
});

// --------------------------------------------------------------------------
// Mock GardenReading model
// --------------------------------------------------------------------------
const mockCreate = jest.fn();
const mockFind = jest.fn();

jest.mock('../models/GardenReading', () => ({
  create: (...args) => mockCreate(...args),
  find: (...args) => mockFind(...args),
  countDocuments: jest.fn(),
}));

const GardenReading = require('../models/GardenReading');
const gardenRoutes = require('../routes/garden');

// --------------------------------------------------------------------------
// Helpers for building query chains
// --------------------------------------------------------------------------
function makeFindQuery(rows) {
  const query = {
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn(async () => rows),
  };
  return query;
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('POST /api/garden/data — Arduino sensor data ingestion', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/garden', gardenRoutes);

    mockCreate.mockImplementation(async (document) => ({
      _id: 'reading-1',
      receivedAt: new Date('2026-07-30T11:30:00.000Z'),
      ...document,
    }));
  });

  // --- 1 ---
  it('requires JWT authentication', async () => {
    await request(app)
      .post('/api/garden/data')
      .send({ gardenId: 'garden-1', ph: 6.2, ec: 1.8, temperature: 22.5, humidity: 65 })
      .expect(401);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- 2 ---
  it('stores a validated sensor reading', async () => {
    const res = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ gardenId: 'garden-1', ph: 6.2, ec: 1.8, temperature: 22.5, humidity: 65 })
      .expect(201);

    expect(mockCreate).toHaveBeenCalledWith({
      owner: USER_ID,
      gardenId: 'garden-1',
      ph: 6.2,
      ec: 1.8,
      temperature: 22.5,
      humidity: 65,
    });
    expect(res.body.success).toBe(true);
    expect(res.body.data.gardenId).toBe('garden-1');
  });

  // --- 3 ---
  it('trims whitespace from gardenId', async () => {
    await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ gardenId: '  garden-1  ', ph: 7, ec: 1, temperature: 20, humidity: 50 })
      .expect(201);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ gardenId: 'garden-1' }),
    );
  });

  // --- 4 ---
  it('rejects missing gardenId', async () => {
    const res = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ ph: 6.2, ec: 1.8, temperature: 22.5, humidity: 65 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/gardenId/i)]),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- 5 ---
  it('rejects empty gardenId string', async () => {
    const res = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ gardenId: '', ph: 6.2, ec: 1.8, temperature: 22.5, humidity: 65 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- 6 ---
  it('rejects out-of-range ph (0–14)', async () => {
    const res = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ gardenId: 'g-1', ph: 18, ec: 1, temperature: 20, humidity: 50 })
      .expect(400);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/ph.*0.*14/i)]),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- 7 ---
  it('rejects negative ec', async () => {
    const res = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ gardenId: 'g-1', ph: 7, ec: -0.5, temperature: 20, humidity: 50 })
      .expect(400);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/non-negative|ec/i)]),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- 8 ---
  it('rejects extreme temperature', async () => {
    const res = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ gardenId: 'g-1', ph: 7, ec: 1, temperature: 200, humidity: 50 })
      .expect(400);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/temperature.*-50.*100/i)]),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- 9 ---
  it('rejects humidity outside 0–100', async () => {
    const res = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ gardenId: 'g-1', ph: 7, ec: 1, temperature: 20, humidity: 150 })
      .expect(400);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/humidity.*0.*100/i)]),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- 10 ---
  it('accepts numeric strings (coerced by Joi)', async () => {
    await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ gardenId: 'g-1', ph: '7.0', ec: '1.5', temperature: '22.0', humidity: '60' })
      .expect(201);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ ph: 7, ec: 1.5, temperature: 22, humidity: 60 }),
    );
  });

  // --- 11 ---
  it('rejects non-numeric values', async () => {
    const res = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ gardenId: 'g-1', ph: 'abc', ec: 1, temperature: 20, humidity: 50 })
      .expect(400);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/ph/i)]),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- 12 ---
  it('rejects excess gardenId length (>80)', async () => {
    const res = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ gardenId: 'x'.repeat(81), ph: 7, ec: 1, temperature: 20, humidity: 50 })
      .expect(400);

    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/80|gardenId/i)]),
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- 13 ---
  it('returns multiple validation errors at once', async () => {
    const res = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ gardenId: '', ph: 18, ec: -1, temperature: 120, humidity: 101 })
      .expect(400);

    expect(res.body.success).toBe(false);
    // Joi with abortEarly: false reports ALL errors
    expect(res.body.errors.length).toBeGreaterThanOrEqual(4);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  // --- 14 ---
  it('handles server error gracefully', async () => {
    mockCreate.mockRejectedValue(new Error('DB connection failed'));

    const res = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({ gardenId: 'g-1', ph: 7, ec: 1, temperature: 20, humidity: 50 })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('DB connection failed');
  });
});

describe('GET /api/garden/:id/stats — historical data & statistics', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/garden', gardenRoutes);
  });

  // --- 15 ---
  it('requires JWT authentication', async () => {
    await request(app)
      .get('/api/garden/garden-1/stats')
      .expect(401);
  });

  // --- 16 ---
  it('returns stats with pagination metadata', async () => {
    const rows = [
      { _id: 'r2', gardenId: 'g-1', ph: 6.6, ec: 2, temperature: 24, humidity: 70, receivedAt: new Date('2026-07-30T11:35:00Z') },
      { _id: 'r1', gardenId: 'g-1', ph: 6.2, ec: 1.8, temperature: 22, humidity: 60, receivedAt: new Date('2026-07-30T11:30:00Z') },
    ];
    const query = makeFindQuery(rows);
    mockFind.mockReturnValue(query);
    GardenReading.countDocuments.mockResolvedValue(2);

    const res = await request(app)
      .get('/api/garden/garden-1/stats?page=1&limit=10')
      .set('Authorization', 'Bearer garden-token')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
      hasMore: false,
    });
    expect(res.body.data.stats.count).toBe(2);
    expect(res.body.data.readings).toHaveLength(2);
  });

  // --- 17 ---
  it('computes correct averages, min, and max', async () => {
    const rows = [
      { _id: 'r2', gardenId: 'g-1', ph: 7, ec: 2, temperature: 24, humidity: 70, receivedAt: new Date('2026-07-30T11:35:00Z') },
      { _id: 'r1', gardenId: 'g-1', ph: 6, ec: 1, temperature: 20, humidity: 60, receivedAt: new Date('2026-07-30T11:30:00Z') },
    ];
    const query = makeFindQuery(rows);
    mockFind.mockReturnValue(query);
    GardenReading.countDocuments.mockResolvedValue(2);

    const res = await request(app)
      .get('/api/garden/garden-1/stats')
      .set('Authorization', 'Bearer garden-token')
      .expect(200);

    expect(res.body.data.stats.averages).toEqual({ ph: 6.5, ec: 1.5, temperature: 22, humidity: 65 });
    expect(res.body.data.stats.min).toEqual({ ph: 6, ec: 1, temperature: 20, humidity: 60 });
    expect(res.body.data.stats.max).toEqual({ ph: 7, ec: 2, temperature: 24, humidity: 70 });
  });

  // --- 18 ---
  it('respects from/to date range filter', async () => {
    const query = makeFindQuery([]);
    mockFind.mockReturnValue(query);
    GardenReading.countDocuments.mockResolvedValue(0);

    await request(app)
      .get('/api/garden/garden-1/stats?from=2026-07-30T00:00:00Z&to=2026-07-30T23:59:59Z')
      .set('Authorization', 'Bearer garden-token')
      .expect(200);

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        receivedAt: {
          $gte: new Date('2026-07-30T00:00:00Z'),
          $lte: new Date('2026-07-30T23:59:59Z'),
        },
      }),
    );
  });

  // --- 19 ---
  it('rejects invalid date format in from parameter', async () => {
    const res = await request(app)
      .get('/api/garden/garden-1/stats?from=not-a-date')
      .set('Authorization', 'Bearer garden-token')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/from/i)]),
    );
  });

  // --- 20 ---
  it('rejects garden id that is just whitespace', async () => {
    const res = await request(app)
      .get('/api/garden/%20%20/stats')
      .set('Authorization', 'Bearer garden-token')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('garden id is required');
  });

  // --- 21 ---
  it('caps limit at 500 and defaults page to 1', async () => {
    const query = makeFindQuery([]);
    mockFind.mockReturnValue(query);
    GardenReading.countDocuments.mockResolvedValue(0);

    // limit=500 (the maximum allowed) should succeed; 9999 should be rejected (covered by #25)
    await request(app)
      .get('/api/garden/garden-1/stats?limit=500')
      .set('Authorization', 'Bearer garden-token')
      .expect(200);

    expect(query.limit).toHaveBeenCalledWith(500);
  });

  // --- 22 ---
  it('returns empty stats when garden has no readings', async () => {
    const query = makeFindQuery([]);
    mockFind.mockReturnValue(query);
    GardenReading.countDocuments.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/garden/empty-garden/stats')
      .set('Authorization', 'Bearer garden-token')
      .expect(200);

    expect(res.body.data.stats.count).toBe(0);
    expect(res.body.data.stats.latest).toBeNull();
    expect(res.body.data.readings).toEqual([]);
    expect(res.body.data.pagination.total).toBe(0);
    expect(res.body.data.pagination.hasMore).toBe(false);
  });

  // --- 23 ---
  it('computes correct pagination with multiple pages', async () => {
    const oneRow = [
      { _id: 'r1', gardenId: 'g-1', ph: 7, ec: 1, temperature: 20, humidity: 50, receivedAt: new Date('2026-07-30T11:30:00Z') },
    ];
    const query = makeFindQuery(oneRow);
    mockFind.mockReturnValue(query);
    GardenReading.countDocuments.mockResolvedValue(25);

    const res = await request(app)
      .get('/api/garden/garden-1/stats?page=2&limit=10')
      .set('Authorization', 'Bearer garden-token')
      .expect(200);

    expect(res.body.data.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasMore: true,
    });
    expect(res.body.data.readings).toHaveLength(1);
  });

  // --- 24 ---
  it('hasMore is false on last page', async () => {
    const query = makeFindQuery([]);
    mockFind.mockReturnValue(query);
    GardenReading.countDocuments.mockResolvedValue(20);

    const res = await request(app)
      .get('/api/garden/garden-1/stats?page=2&limit=10')
      .set('Authorization', 'Bearer garden-token')
      .expect(200);

    expect(res.body.data.pagination.hasMore).toBe(false);
  });

  // --- 25 ---
  it('rejects limit above 500', async () => {
    const res = await request(app)
      .get('/api/garden/garden-1/stats?limit=501')
      .set('Authorization', 'Bearer garden-token')
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  // --- 26 ---
  it('defaults limit to 100 and page to 1', async () => {
    const query = makeFindQuery([]);
    mockFind.mockReturnValue(query);
    GardenReading.countDocuments.mockResolvedValue(0);

    await request(app)
      .get('/api/garden/garden-1/stats')
      .set('Authorization', 'Bearer garden-token')
      .expect(200);

    expect(query.skip).toHaveBeenCalledWith(0);
    expect(query.limit).toHaveBeenCalledWith(100);
  });

  // --- 27 ---
  it('includes latest reading in stats', async () => {
    const rows = [
      { _id: 'r2', gardenId: 'g-1', ph: 6.6, ec: 2, temperature: 24, humidity: 70, receivedAt: new Date('2026-07-30T11:35:00Z') },
      { _id: 'r1', gardenId: 'g-1', ph: 6.2, ec: 1.8, temperature: 22, humidity: 60, receivedAt: new Date('2026-07-30T11:30:00Z') },
    ];
    const query = makeFindQuery(rows);
    mockFind.mockReturnValue(query);
    GardenReading.countDocuments.mockResolvedValue(2);

    const res = await request(app)
      .get('/api/garden/garden-1/stats')
      .set('Authorization', 'Bearer garden-token')
      .expect(200);

    expect(res.body.data.stats.latest.ph).toBe(6.6);
    expect(res.body.data.stats.latest.gardenId).toBe('g-1');
  });

  // --- 28 ---
  it('handles server error gracefully on stats', async () => {
    mockFind.mockImplementation(() => { throw new Error('Query failed'); });

    const res = await request(app)
      .get('/api/garden/garden-1/stats')
      .set('Authorization', 'Bearer garden-token')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Query failed');
  });
});
