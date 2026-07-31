const express = require('express');
const request = require('supertest');

const USER_ID = '000000000000000000000123';
const OTHER_USER_ID = '000000000000000000000456';

// ── Auth mock ────────────────────────────────────────────────────────
jest.mock('../middleware/auth', () => (req, res, next) => {
  if (req.get('Authorization') !== 'Bearer seed-token') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = { _id: USER_ID, id: USER_ID };
  return next();
});

// ── Helper: chained find() mock query (for .sort().skip().limit().lean()) ──
function makeFindQuery(rows) {
  const query = {
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn(async () => rows),
  };
  return query;
}

// ── GardenReading mock (existing CSV/GeoJSON exports) ────────────────
jest.mock('../models/GardenReading', () => ({
  findOne: jest.fn(),
}));

// ── SeedExchange mock (new CRUD endpoints) ───────────────────────────
const mockListings = [];

const mockSeedExchangeModule = {
  create: jest.fn(async (doc) => {
    const entry = {
      _id: String(mockListings.length + 1),
      owner: doc.owner,
      plant: doc.plant,
      type: doc.type,
      variety: doc.variety || null,
      location: doc.location || null,
      description: doc.description || null,
      price: doc.price ?? null,
      quantity: doc.quantity ?? null,
      status: doc.status || 'available',
      images: doc.images || [],
      createdAt: new Date('2026-07-30T12:00:00.000Z'),
      updatedAt: new Date('2026-07-30T12:00:00.000Z'),
    };
    mockListings.push(entry);
    return entry;
  }),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
};

jest.mock('../models/SeedExchange', () => mockSeedExchangeModule);

const GardenReading = require('../models/GardenReading');
const SeedExchange = require('../models/SeedExchange');
const seedExchangeRoutes = require('../routes/seedExchange');

// ── Shared sample listings ──────────────────────────────────────────

function getSampleListings() {
  return [
    {
      _id: 'listing-1',
      owner: USER_ID,
      plant: 'Tomato',
      type: 'seed',
      variety: 'San Marzano',
      location: 'Rome',
      description: 'Organic San Marzano tomato seeds',
      price: 3.5,
      quantity: 50,
      status: 'available',
      images: [],
      createdAt: new Date('2026-07-30T11:00:00.000Z'),
      updatedAt: new Date('2026-07-30T11:00:00.000Z'),
    },
    {
      _id: 'listing-2',
      owner: USER_ID,
      plant: 'Basil',
      type: 'seedling',
      variety: 'Genovese',
      location: 'Milan',
      description: 'Sweet basil seedlings',
      price: 2.0,
      quantity: 10,
      status: 'available',
      images: [],
      createdAt: new Date('2026-07-30T12:00:00.000Z'),
      updatedAt: new Date('2026-07-30T12:00:00.000Z'),
    },
    {
      _id: 'listing-3',
      owner: OTHER_USER_ID,
      plant: 'Pepper',
      type: 'seed',
      variety: 'Bell',
      location: 'Naples',
      description: 'Bell pepper seeds',
      price: null,
      quantity: 100,
      status: 'available',
      images: [],
      createdAt: new Date('2026-07-30T10:00:00.000Z'),
      updatedAt: new Date('2026-07-30T10:00:00.000Z'),
    },
    {
      _id: 'listing-4',
      owner: USER_ID,
      plant: 'Lavender',
      type: 'cutting',
      variety: null,
      location: 'Florence',
      description: 'Lavender cuttings',
      price: 5.0,
      quantity: 5,
      status: 'sold',
      images: [],
      createdAt: new Date('2026-07-29T12:00:00.000Z'),
      updatedAt: new Date('2026-07-29T12:00:00.000Z'),
    },
  ];
}

// ── Shared mock reading for CSV/GeoJSON tests ────────────────────────

const mockReading = {
  _id: '507f1f77bcf86cd799439011',
  gardenId: 'garden-1',
  ph: 6.2,
  ec: 1.8,
  temperature: 22.5,
  humidity: 65,
  receivedAt: new Date('2026-07-30T11:30:00.000Z'),
  createdAt: new Date('2026-07-30T11:30:01.000Z'),
  updatedAt: new Date('2026-07-30T11:30:02.000Z'),
};

// =====================================================================
//  Seed Exchange – CSV / GeoJSON export (existing tests preserved)
// =====================================================================
describe('Seed Exchange – CSV / GeoJSON export', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/seed-exchange', seedExchangeRoutes);
  });

  it('rejects CSV export without auth token', async () => {
    await request(app)
      .get('/api/seed-exchange/garden-readings/507f1f77bcf86cd799439011/csv')
      .expect(401);
    expect(GardenReading.findOne).not.toHaveBeenCalled();
  });

  it('rejects GeoJSON export without auth token', async () => {
    await request(app)
      .get('/api/seed-exchange/garden-readings/507f1f77bcf86cd799439011/geojson')
      .expect(401);
    expect(GardenReading.findOne).not.toHaveBeenCalled();
  });

  it('returns 404 when the garden reading does not exist (CSV)', async () => {
    GardenReading.findOne.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/seed-exchange/garden-readings/507f1f77bcf86cd799439011/csv')
      .set('Authorization', 'Bearer seed-token')
      .expect(404);

    expect(res.body).toEqual({ success: false, error: 'Garden reading not found' });
    expect(GardenReading.findOne).toHaveBeenCalledWith({
      _id: '507f1f77bcf86cd799439011',
      owner: USER_ID,
    });
  });

  it('returns 404 when the garden reading does not exist (GeoJSON)', async () => {
    GardenReading.findOne.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/seed-exchange/garden-readings/507f1f77bcf86cd799439011/geojson')
      .set('Authorization', 'Bearer seed-token')
      .expect(404);

    expect(res.body).toEqual({ success: false, error: 'Garden reading not found' });
  });

  it('exports a valid CSV with correct headers and values', async () => {
    GardenReading.findOne.mockResolvedValue(mockReading);

    const res = await request(app)
      .get('/api/seed-exchange/garden-readings/507f1f77bcf86cd799439011/csv')
      .set('Authorization', 'Bearer seed-token')
      .expect(200)
      .expect('Content-Type', /text\/csv/)
      .expect('Content-Disposition', /attachment; filename="garden-reading-507f1f77bcf86cd799439011\.csv"/);

    expect(res.text).toMatch(/^id,gardenId,ph,ec,temperature,humidity,receivedAt,createdAt,updatedAt\n/);
    expect(res.text).toContain('507f1f77bcf86cd799439011');
    expect(res.text).toContain('garden-1');
    expect(res.text).toContain('6.2');
    expect(res.text).toContain('1.8');
    expect(res.text).toContain('22.5');
    expect(res.text).toContain('65');
    expect(res.text).toContain('2026-07-30T11:30:00.000Z');
    expect(res.text).toContain('2026-07-30T11:30:01.000Z');
    expect(res.text).toContain('2026-07-30T11:30:02.000Z');
    expect(GardenReading.findOne).toHaveBeenCalledTimes(1);
  });

  it('CSV file ends with a trailing newline', async () => {
    GardenReading.findOne.mockResolvedValue(mockReading);

    const res = await request(app)
      .get('/api/seed-exchange/garden-readings/507f1f77bcf86cd799439011/csv')
      .set('Authorization', 'Bearer seed-token')
      .expect(200);

    expect(res.text.endsWith('\n')).toBe(true);
  });

  it('escapes special CSV characters in string fields', async () => {
    const readingWithComma = {
      ...mockReading,
      gardenId: 'garden,1',
    };
    GardenReading.findOne.mockResolvedValue(readingWithComma);

    const res = await request(app)
      .get('/api/seed-exchange/garden-readings/507f1f77bcf86cd799439011/csv')
      .set('Authorization', 'Bearer seed-token')
      .expect(200);

    expect(res.text).toContain('"garden,1"');
  });

  it('exports a valid GeoJSON FeatureCollection', async () => {
    GardenReading.findOne.mockResolvedValue(mockReading);

    const res = await request(app)
      .get('/api/seed-exchange/garden-readings/507f1f77bcf86cd799439011/geojson')
      .set('Authorization', 'Bearer seed-token')
      .expect(200)
      .expect('Content-Type', /application\/geo\+json/)
      .expect('Content-Disposition', /attachment; filename="garden-reading-507f1f77bcf86cd799439011\.geojson"/);

    expect(res.body).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: null,
          properties: {
            id: '507f1f77bcf86cd799439011',
            gardenId: 'garden-1',
            ph: 6.2,
            ec: 1.8,
            temperature: 22.5,
            humidity: 65,
            receivedAt: '2026-07-30T11:30:00.000Z',
            createdAt: '2026-07-30T11:30:01.000Z',
            updatedAt: '2026-07-30T11:30:02.000Z',
          },
        },
      ],
    });
    expect(GardenReading.findOne).toHaveBeenCalledTimes(1);
  });

  it('GeoJSON uses null geometry (readings are not geolocated)', async () => {
    GardenReading.findOne.mockResolvedValue(mockReading);

    const res = await request(app)
      .get('/api/seed-exchange/garden-readings/507f1f77bcf86cd799439011/geojson')
      .set('Authorization', 'Bearer seed-token')
      .expect(200);

    expect(res.body.features[0].geometry).toBeNull();
  });

  it('returns 500 on database error (CSV)', async () => {
    GardenReading.findOne.mockRejectedValue(new Error('DB connection lost'));

    const res = await request(app)
      .get('/api/seed-exchange/garden-readings/507f1f77bcf86cd799439011/csv')
      .set('Authorization', 'Bearer seed-token')
      .expect(500);

    expect(res.body).toEqual({ success: false, error: 'DB connection lost' });
  });

  it('returns 500 on database error (GeoJSON)', async () => {
    GardenReading.findOne.mockRejectedValue(new Error('DB connection lost'));

    const res = await request(app)
      .get('/api/seed-exchange/garden-readings/507f1f77bcf86cd799439011/geojson')
      .set('Authorization', 'Bearer seed-token')
      .expect(500);

    expect(res.body).toEqual({ success: false, error: 'DB connection lost' });
  });

  it('CSV properly escapes double-quotes inside values', async () => {
    const readingWithQuotes = {
      ...mockReading,
      gardenId: 'garden "alpha"',
    };
    GardenReading.findOne.mockResolvedValue(readingWithQuotes);

    const res = await request(app)
      .get('/api/seed-exchange/garden-readings/507f1f77bcf86cd799439011/csv')
      .set('Authorization', 'Bearer seed-token')
      .expect(200);

    expect(res.text).toContain('"garden ""alpha"""');
  });
});

// =====================================================================
//  Seed Exchange – CRUD API (new endpoints)
// =====================================================================
describe('Seed Exchange – CRUD API', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    mockListings.length = 0;

    app = express();
    app.use(express.json());
    app.use('/api/seed-exchange', seedExchangeRoutes);
  });

  // ── POST /api/seed-exchange ─────────────────────────────────────────

  describe('POST /api/seed-exchange', () => {
    it('rejects without authentication', async () => {
      await request(app)
        .post('/api/seed-exchange')
        .send({ plant: 'Tomato', type: 'seed' })
        .expect(401);

      expect(SeedExchange.create).not.toHaveBeenCalled();
    });

    it('creates a valid seed exchange listing', async () => {
      const response = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', 'Bearer seed-token')
        .send({
          plant: 'Tomato',
          type: 'seed',
          variety: 'San Marzano',
          location: 'Rome',
          description: 'Heirloom tomato seeds, high germination rate',
          price: 3.5,
          quantity: 50,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        plant: 'Tomato',
        type: 'seed',
        variety: 'San Marzano',
        location: 'Rome',
        price: 3.5,
        quantity: 50,
        status: 'available',
      });
      expect(response.body.data.owner).toBe(USER_ID);
      expect(SeedExchange.create).toHaveBeenCalledTimes(1);
    });

    it('creates a listing with minimal fields (only plant + type)', async () => {
      const response = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', 'Bearer seed-token')
        .send({ plant: 'Basil', type: 'seed' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plant).toBe('Basil');
      expect(response.body.data.type).toBe('seed');
      expect(response.body.data.status).toBe('available');
    });

    it('rejects when plant is missing', async () => {
      const response = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', 'Bearer seed-token')
        .send({ type: 'seed' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('plant is required');
      expect(SeedExchange.create).not.toHaveBeenCalled();
    });

    it('rejects when type is missing', async () => {
      const response = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', 'Bearer seed-token')
        .send({ plant: 'Tomato' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('type is required');
      expect(SeedExchange.create).not.toHaveBeenCalled();
    });

    it('rejects invalid type value', async () => {
      const response = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', 'Bearer seed-token')
        .send({ plant: 'Tomato', type: 'flowerpot' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain(
        'type must be one of: seed, cutting, seedling, plant, bulb, tuber, other'
      );
    });

    it('rejects negative price', async () => {
      const response = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', 'Bearer seed-token')
        .send({ plant: 'Tomato', type: 'seed', price: -1 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('price must be a non-negative number');
    });

    it('rejects non-integer quantity', async () => {
      const response = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', 'Bearer seed-token')
        .send({ plant: 'Tomato', type: 'seed', quantity: 1.5 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('quantity must be a positive integer');
    });

    it('rejects description exceeding 2000 characters', async () => {
      const response = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', 'Bearer seed-token')
        .send({
          plant: 'Tomato',
          type: 'seed',
          description: 'x'.repeat(2001),
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('description must be 2000 characters or less');
    });

    it('rejects empty body', async () => {
      const response = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', 'Bearer seed-token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining(['plant is required', 'type is required'])
      );
    });

    it('returns 500 on database error', async () => {
      SeedExchange.create.mockRejectedValue(new Error('DB write failed'));

      const response = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', 'Bearer seed-token')
        .send({ plant: 'Tomato', type: 'seed' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('DB write failed');
    });
  });

  // ── GET /api/seed-exchange (list) ──────────────────────────────────

  describe('GET /api/seed-exchange (list)', () => {
    it('returns all available listings by default', async () => {
      const listings = getSampleListings();
      const available = listings.filter((l) => l.status === 'available');

      SeedExchange.find.mockReturnValue(makeFindQuery(available));
      SeedExchange.countDocuments.mockResolvedValue(available.length);

      const response = await request(app)
        .get('/api/seed-exchange')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.pagination.total).toBe(3);
      expect(SeedExchange.find).toHaveBeenCalledWith({ status: 'available' });
    });

    it('filters by plant name (case-insensitive)', async () => {
      const filtered = [
        { _id: 'listing-1', plant: 'Tomato', type: 'seed', status: 'available' },
      ];
      SeedExchange.find.mockReturnValue(makeFindQuery(filtered));
      SeedExchange.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/seed-exchange?plant=tomato')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(SeedExchange.find).toHaveBeenCalledWith(
        expect.objectContaining({ plant: { $regex: 'tomato', $options: 'i' } })
      );
    });

    it('filters by type', async () => {
      const filtered = [
        { _id: 'listing-2', plant: 'Basil', type: 'seedling', status: 'available' },
      ];
      SeedExchange.find.mockReturnValue(makeFindQuery(filtered));
      SeedExchange.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/seed-exchange?type=seedling')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(SeedExchange.find).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'seedling' })
      );
    });

    it('filters by location (case-insensitive)', async () => {
      const filtered = [
        { _id: 'listing-1', plant: 'Tomato', location: 'Rome', status: 'available' },
      ];
      SeedExchange.find.mockReturnValue(makeFindQuery(filtered));
      SeedExchange.countDocuments.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/seed-exchange?location=rome')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(SeedExchange.find).toHaveBeenCalledWith(
        expect.objectContaining({ location: { $regex: 'rome', $options: 'i' } })
      );
    });

    it('accepts combined filters (plant + type + location)', async () => {
      SeedExchange.find.mockReturnValue(makeFindQuery([]));
      SeedExchange.countDocuments.mockResolvedValue(0);

      await request(app)
        .get('/api/seed-exchange?plant=basil&type=seedling&location=milan')
        .expect(200);

      expect(SeedExchange.find).toHaveBeenCalledWith({
        plant: { $regex: 'basil', $options: 'i' },
        type: 'seedling',
        location: { $regex: 'milan', $options: 'i' },
        status: 'available',
      });
    });

    it('shows all statuses when ?status=all', async () => {
      const listings = getSampleListings();
      SeedExchange.find.mockReturnValue(makeFindQuery(listings));
      SeedExchange.countDocuments.mockResolvedValue(listings.length);

      const response = await request(app)
        .get('/api/seed-exchange?status=all')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(4);
      expect(SeedExchange.find).toHaveBeenCalledWith({});
    });

    it('supports pagination via page and limit', async () => {
      SeedExchange.find.mockReturnValue(makeFindQuery([]));
      SeedExchange.countDocuments.mockResolvedValue(10);

      const response = await request(app)
        .get('/api/seed-exchange?page=2&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 10,
        pages: 2,
      });
    });

    it('clamps limit between 1 and 100', async () => {
      SeedExchange.find.mockReturnValue(makeFindQuery([]));
      SeedExchange.countDocuments.mockResolvedValue(0);

      await request(app)
        .get('/api/seed-exchange?limit=999')
        .expect(200);

      const findCall = SeedExchange.find.mock.calls[0][0];
      expect(findCall).toEqual({ status: 'available' });
    });

    it('returns empty array when no listings match', async () => {
      SeedExchange.find.mockReturnValue(makeFindQuery([]));
      SeedExchange.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/seed-exchange?plant=xyzzy')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
    });

    it('returns 500 on database error', async () => {
      SeedExchange.find.mockImplementation(() => {
        throw new Error('DB query failed');
      });

      const response = await request(app)
        .get('/api/seed-exchange')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('DB query failed');
    });
  });

  // ── GET /api/seed-exchange/:id ─────────────────────────────────────

  describe('GET /api/seed-exchange/:id', () => {
    it('returns a listing by ID', async () => {
      const listings = getSampleListings();
      SeedExchange.findById.mockImplementation(async (id) => {
        return listings.find((l) => l._id === id) || null;
      });

      const response = await request(app)
        .get('/api/seed-exchange/listing-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plant).toBe('Tomato');
      expect(response.body.data.type).toBe('seed');
      expect(response.body.data.location).toBe('Rome');
    });

    it('returns 404 for non-existent listing', async () => {
      SeedExchange.findById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/seed-exchange/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Seed exchange listing not found');
    });

    it('returns 404 for invalid ObjectId format', async () => {
      SeedExchange.findById.mockImplementation(async () => {
        const err = new Error('Cast to ObjectId failed');
        err.name = 'CastError';
        err.kind = 'ObjectId';
        throw err;
      });

      const response = await request(app)
        .get('/api/seed-exchange/invalid-id-format')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Seed exchange listing not found');
    });

    it('returns 500 on database error', async () => {
      SeedExchange.findById.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .get('/api/seed-exchange/listing-1')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('DB error');
    });
  });

  // ── PUT /api/seed-exchange/:id ─────────────────────────────────────

  describe('PUT /api/seed-exchange/:id', () => {
    it('rejects without authentication', async () => {
      await request(app)
        .put('/api/seed-exchange/listing-1')
        .send({ plant: 'Updated' })
        .expect(401);
    });

    it('updates a listing owned by the authenticated user', async () => {
      const listings = getSampleListings();
      const target = { ...listings[0] };
      target.save = jest.fn().mockResolvedValue({
        ...target,
        plant: 'Updated Tomato',
        price: 4.0,
      });

      SeedExchange.findById.mockImplementation(async (id) => {
        return listings.find((l) => l._id === id) ? target : null;
      });

      const response = await request(app)
        .put('/api/seed-exchange/listing-1')
        .set('Authorization', 'Bearer seed-token')
        .send({ plant: 'Updated Tomato', price: 4.0 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.plant).toBe('Updated Tomato');
      expect(target.save).toHaveBeenCalled();
    });

    it('rejects update from non-owner', async () => {
      const listings = getSampleListings();
      SeedExchange.findById.mockImplementation(async (id) => {
        return listings.find((l) => l._id === id) || null;
      });

      const response = await request(app)
        .put('/api/seed-exchange/listing-3')
        .set('Authorization', 'Bearer seed-token')
        .send({ plant: 'Hacked' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not authorized to update this listing');
    });

    it('returns 404 for non-existent listing', async () => {
      SeedExchange.findById.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/seed-exchange/nonexistent')
        .set('Authorization', 'Bearer seed-token')
        .send({ plant: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Seed exchange listing not found');
    });

    it('validates fields on update', async () => {
      const listings = getSampleListings();
      const target = { ...listings[0], save: jest.fn() };

      SeedExchange.findById.mockImplementation(async (id) => {
        return listings.find((l) => l._id === id) ? target : null;
      });

      const response = await request(app)
        .put('/api/seed-exchange/listing-1')
        .set('Authorization', 'Bearer seed-token')
        .send({ type: 'invalid-type' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain(
        'type must be one of: seed, cutting, seedling, plant, bulb, tuber, other'
      );
      expect(target.save).not.toHaveBeenCalled();
    });

    it('partially updates only the provided fields', async () => {
      const listings = getSampleListings();
      const target = {
        ...listings[0],
        save: jest.fn().mockResolvedValue({ ...listings[0], location: 'Updated Location' }),
      };

      SeedExchange.findById.mockImplementation(async (id) => {
        return listings.find((l) => l._id === id) ? target : null;
      });

      const response = await request(app)
        .put('/api/seed-exchange/listing-1')
        .set('Authorization', 'Bearer seed-token')
        .send({ location: 'Updated Location' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.location).toBe('Updated Location');
      expect(target.save).toHaveBeenCalled();
    });

    it('returns 500 on database error', async () => {
      SeedExchange.findById.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .put('/api/seed-exchange/listing-1')
        .set('Authorization', 'Bearer seed-token')
        .send({ plant: 'Test' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('DB error');
    });
  });

  // ── DELETE /api/seed-exchange/:id ──────────────────────────────────

  describe('DELETE /api/seed-exchange/:id', () => {
    it('rejects without authentication', async () => {
      await request(app)
        .delete('/api/seed-exchange/listing-1')
        .expect(401);
    });

    it('deletes a listing owned by the authenticated user', async () => {
      const listings = getSampleListings();
      SeedExchange.findById.mockImplementation(async (id) => {
        return listings.find((l) => l._id === id) || null;
      });
      SeedExchange.findByIdAndDelete.mockResolvedValue(listings[0]);

      const response = await request(app)
        .delete('/api/seed-exchange/listing-1')
        .set('Authorization', 'Bearer seed-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(SeedExchange.findByIdAndDelete).toHaveBeenCalledWith('listing-1');
    });

    it('rejects deletion from non-owner', async () => {
      const listings = getSampleListings();
      SeedExchange.findById.mockImplementation(async (id) => {
        return listings.find((l) => l._id === id) || null;
      });

      const response = await request(app)
        .delete('/api/seed-exchange/listing-3')
        .set('Authorization', 'Bearer seed-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Not authorized to delete this listing');
      expect(SeedExchange.findByIdAndDelete).not.toHaveBeenCalled();
    });

    it('returns 404 for non-existent listing', async () => {
      SeedExchange.findById.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/seed-exchange/nonexistent')
        .set('Authorization', 'Bearer seed-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Seed exchange listing not found');
    });

    it('returns 500 on database error', async () => {
      SeedExchange.findById.mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .delete('/api/seed-exchange/listing-1')
        .set('Authorization', 'Bearer seed-token')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('DB error');
    });
  });
});
