const express = require('express');
const request = require('supertest');

const USER_ID = '000000000000000000000123';
const USER_ID_2 = '000000000000000000000456';

// ──────────────────────────────────────────────
//  Mock auth middleware
// ──────────────────────────────────────────────
jest.mock('../middleware/auth', () => (req, res, next) => {
  if (req.get('Authorization') !== 'Bearer seed-token') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = { _id: USER_ID, id: USER_ID };
  return next();
});

// ──────────────────────────────────────────────
//  In-memory data store for mocked model
// ──────────────────────────────────────────────
let seedData = [];
let nextId = 1;

const mockCreate = jest.fn(async (doc) => {
  const listing = {
    _id: `seed-${nextId++}`,
    owner: doc.owner || USER_ID,
    plant: doc.plant,
    variety: doc.variety || '',
    type: doc.type || 'other',
    quantity: doc.quantity,
    location: doc.location || '',
    exchangeType: doc.exchangeType || 'give',
    description: doc.description || '',
    createdAt: new Date('2026-07-30T12:00:00.000Z'),
    updatedAt: new Date('2026-07-30T12:00:00.000Z'),
    ...doc,
  };
  seedData.push(listing);
  return listing;
});

const mockFind = jest.fn((filter = {}) => {
  let results = [...seedData];

  if (filter.plant && filter.plant.$regex) {
    const re = new RegExp(filter.plant.$regex, filter.plant.$options || '');
    results = results.filter((l) => re.test(l.plant));
  }
  if (filter.type && filter.type.$regex) {
    const re = new RegExp(filter.type.$regex, filter.type.$options || '');
    results = results.filter((l) => re.test(l.type));
  }
  if (filter.location && filter.location.$regex) {
    const re = new RegExp(filter.location.$regex, filter.location.$options || '');
    results = results.filter((l) => re.test(l.location));
  }
  if (filter.exchangeType) {
    results = results.filter((l) => l.exchangeType === filter.exchangeType);
  }
  if (filter.createdAt) {
    if (filter.createdAt.$gte) {
      results = results.filter((l) => new Date(l.createdAt) >= filter.createdAt.$gte);
    }
    if (filter.createdAt.$lte) {
      results = results.filter((l) => new Date(l.createdAt) <= filter.createdAt.$lte);
    }
  }

  // Support chaining: sort, skip, limit, lean
  const query = {
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn(async () => results),
  };
  // Allow passing through sort/skip/limit
  query.sort.mockImplementation(() => query);
  query.skip.mockImplementation(() => query);
  query.limit.mockImplementation(() => query);
  query.lean.mockImplementation(async () => results);

  return query;
});

const mockFindById = jest.fn(async (id) => {
  return seedData.find((l) => l._id === id) || null;
});

const mockCountDocuments = jest.fn(async (filter = {}) => {
  let results = [...seedData];
  if (filter.plant && filter.plant.$regex) {
    const re = new RegExp(filter.plant.$regex, filter.plant.$options || '');
    results = results.filter((l) => re.test(l.plant));
  }
  return results.length;
});

const mockFindOneAndDelete = jest.fn(async (filter) => {
  const idx = seedData.findIndex(
    (l) => l._id === filter._id && l.owner.toString() === filter.owner.toString()
  );
  if (idx === -1) return null;
  const removed = seedData.splice(idx, 1)[0];
  return removed;
});

jest.mock('../models/SeedExchange', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  countDocuments: jest.fn(),
  findOneAndDelete: jest.fn(),
}));

const SeedExchange = require('../models/SeedExchange');
const seedExchangeRoutes = require('../routes/seedExchange');

// ──────────────────────────────────────────────
//  Tests
// ──────────────────────────────────────────────
describe('Seed Exchange API', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    seedData = [];
    nextId = 1;

    // Wire mocks
    SeedExchange.create.mockImplementation(mockCreate);
    SeedExchange.find.mockImplementation(mockFind);
    SeedExchange.findById.mockImplementation(mockFindById);
    SeedExchange.countDocuments.mockImplementation(mockCountDocuments);
    SeedExchange.findOneAndDelete.mockImplementation(mockFindOneAndDelete);

    app = express();
    app.use(express.json());
    app.use('/api/seed-exchange', seedExchangeRoutes);
  });

  // ───────── CRUD tests ─────────

  test('POST /api/seed-exchange – creates a listing when authenticated', async () => {
    const res = await request(app)
      .post('/api/seed-exchange')
      .set('Authorization', 'Bearer seed-token')
      .send({
        plant: 'Tomato',
        variety: 'Cherry',
        type: 'vegetable',
        quantity: 10,
        location: 'Backyard',
        exchangeType: 'swap',
        description: 'Sweet cherry tomatoes',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.plant).toBe('Tomato');
    expect(res.body.data.quantity).toBe(10);
    expect(SeedExchange.create).toHaveBeenCalledTimes(1);
  });

  test('POST /api/seed-exchange – rejects unauthenticated requests', async () => {
    const res = await request(app)
      .post('/api/seed-exchange')
      .send({ plant: 'Basil', quantity: 5 })
      .expect(401);

    expect(SeedExchange.create).not.toHaveBeenCalled();
  });

  test('POST /api/seed-exchange – rejects missing plant field', async () => {
    const res = await request(app)
      .post('/api/seed-exchange')
      .set('Authorization', 'Bearer seed-token')
      .send({ quantity: 5 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('plant');
    expect(SeedExchange.create).not.toHaveBeenCalled();
  });

  test('POST /api/seed-exchange – rejects negative quantity', async () => {
    const res = await request(app)
      .post('/api/seed-exchange')
      .set('Authorization', 'Bearer seed-token')
      .send({ plant: 'Mint', quantity: -1 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  test('GET /api/seed-exchange – returns empty list when no listings', async () => {
    const res = await request(app)
      .get('/api/seed-exchange')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  test('GET /api/seed-exchange – returns all listings with pagination', async () => {
    // Seed data
    seedData = [
      { _id: 's1', plant: 'Tomato', variety: '', type: 'vegetable', quantity: 10, location: '', exchangeType: 'give', description: '', createdAt: new Date(), updatedAt: new Date() },
      { _id: 's2', plant: 'Basil', variety: '', type: 'herb', quantity: 5, location: '', exchangeType: 'swap', description: '', createdAt: new Date(), updatedAt: new Date() },
    ];
    nextId = 3;

    const res = await request(app)
      .get('/api/seed-exchange')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(2);
  });

  test('GET /api/seed-exchange – filters by plant query param', async () => {
    seedData = [
      { _id: 's1', plant: 'Tomato', variety: '', type: 'vegetable', quantity: 10, location: '', exchangeType: 'give', description: '', createdAt: new Date(), updatedAt: new Date() },
      { _id: 's2', plant: 'Basil', variety: '', type: 'herb', quantity: 5, location: '', exchangeType: 'swap', description: '', createdAt: new Date(), updatedAt: new Date() },
    ];

    const res = await request(app)
      .get('/api/seed-exchange?plant=basil')
      .expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].plant).toBe('Basil');
  });

  test('GET /api/seed-exchange/:id – returns a single listing', async () => {
    seedData = [{ _id: 's42', plant: 'Lettuce', variety: 'Romaine', type: 'vegetable', quantity: 5, location: 'Greenhouse', exchangeType: 'swap', description: '', createdAt: new Date(), updatedAt: new Date() }];

    const res = await request(app)
      .get('/api/seed-exchange/s42')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.plant).toBe('Lettuce');
  });

  test('GET /api/seed-exchange/:id – 404 for nonexistent id', async () => {
    const res = await request(app)
      .get('/api/seed-exchange/nonexistent')
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  // ───────── CSV export tests ─────────

  test('GET /api/seed-exchange/export/csv – returns CSV with correct Content-Type', async () => {
    seedData = [
      { _id: 's1', plant: 'Tomato', variety: 'Cherry', type: 'vegetable', quantity: 10, location: 'Garden', exchangeType: 'give', description: 'Sweet', createdAt: new Date('2026-07-30T12:00:00Z'), updatedAt: new Date('2026-07-30T12:00:00Z') },
    ];

    const res = await request(app)
      .get('/api/seed-exchange/export/csv')
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.text).toContain('Tomato');
    expect(res.text).toContain('Cherry');
    expect(res.text).toContain('Garden');
    // Verify header row
    const lines = res.text.trim().split('\n');
    expect(lines[0]).toContain('_id,plant,variety');
  });

  test('GET /api/seed-exchange/export/csv – 404 when no listings match filter', async () => {
    seedData = [
      { _id: 's1', plant: 'Tomato', variety: '', type: 'vegetable', quantity: 10, location: '', exchangeType: 'give', description: '', createdAt: new Date(), updatedAt: new Date() },
    ];

    const res = await request(app)
      .get('/api/seed-exchange/export/csv?plant=NonExistent')
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  test('GET /api/seed-exchange/export/csv – respects filter query params', async () => {
    seedData = [
      { _id: 's1', plant: 'Tomato', variety: '', type: 'vegetable', quantity: 10, location: 'Garden', exchangeType: 'give', description: '', createdAt: new Date(), updatedAt: new Date() },
      { _id: 's2', plant: 'Basil', variety: '', type: 'herb', quantity: 5, location: 'Kitchen', exchangeType: 'swap', description: '', createdAt: new Date(), updatedAt: new Date() },
    ];

    const res = await request(app)
      .get('/api/seed-exchange/export/csv?type=herb')
      .expect(200);

    expect(res.text).toContain('Basil');
    expect(res.text).not.toContain('Tomato');
  });

  // ───────── GeoJSON export tests ─────────

  test('GET /api/seed-exchange/export/geojson – returns FeatureCollection', async () => {
    seedData = [
      { _id: 's1', plant: 'Tomato', variety: 'Cherry', type: 'vegetable', quantity: 10, location: 'Garden', exchangeType: 'give', description: 'Sweet', createdAt: new Date('2026-07-30T12:00:00Z'), updatedAt: new Date('2026-07-30T12:00:00Z') },
    ];

    const res = await request(app)
      .get('/api/seed-exchange/export/geojson')
      .expect(200);

    expect(res.body.type).toBe('FeatureCollection');
    expect(Array.isArray(res.body.features)).toBe(true);
    expect(res.body.features).toHaveLength(1);
  });

  test('GET /api/seed-exchange/export/geojson – each feature has null geometry and properties', async () => {
    seedData = [
      { _id: 's1', plant: 'Lettuce', variety: 'Romaine', type: 'vegetable', quantity: 5, location: 'Backyard', exchangeType: 'swap', description: '', createdAt: new Date('2026-07-30T12:00:00Z'), updatedAt: new Date('2026-07-30T12:00:00Z') },
    ];

    const res = await request(app)
      .get('/api/seed-exchange/export/geojson')
      .expect(200);

    const feature = res.body.features[0];
    expect(feature.type).toBe('Feature');
    expect(feature.geometry).toBeNull();
    expect(feature.properties).toBeDefined();
    expect(feature.properties.plant).toBe('Lettuce');
    expect(feature.properties.exchangeType).toBe('swap');
  });

  test('GET /api/seed-exchange/export/geojson – respects filter query params', async () => {
    seedData = [
      { _id: 's1', plant: 'Tomato', variety: '', type: 'vegetable', quantity: 10, location: 'Garden', exchangeType: 'give', description: '', createdAt: new Date(), updatedAt: new Date() },
      { _id: 's2', plant: 'Basil', variety: '', type: 'herb', quantity: 5, location: 'Kitchen', exchangeType: 'swap', description: '', createdAt: new Date(), updatedAt: new Date() },
    ];

    const res = await request(app)
      .get('/api/seed-exchange/export/geojson?location=Kitchen')
      .expect(200);

    expect(res.body.features).toHaveLength(1);
    expect(res.body.features[0].properties.plant).toBe('Basil');
  });

  test('GET /api/seed-exchange/export/geojson – returns empty FeatureCollection when no data', async () => {
    const res = await request(app)
      .get('/api/seed-exchange/export/geojson')
      .expect(200);

    expect(res.body.type).toBe('FeatureCollection');
    expect(res.body.features).toEqual([]);
  });

  // ───────── Delete test ─────────

  test('DELETE /api/seed-exchange/:id – deletes own listing', async () => {
    seedData = [
      { _id: 's1', plant: 'Mint', variety: '', type: 'herb', quantity: 3, location: '', exchangeType: 'give', description: '', createdAt: new Date(), updatedAt: new Date(), owner: USER_ID },
    ];

    const res = await request(app)
      .delete('/api/seed-exchange/s1')
      .set('Authorization', 'Bearer seed-token')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(SeedExchange.findOneAndDelete).toHaveBeenCalledWith({
      _id: 's1',
      owner: USER_ID,
    });
  });
});
