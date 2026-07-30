const request = require('supertest');
const express = require('express');

// ─── Mock SeedExchange model ──────────────────────────────────────────────────

// A thenable mock result that supports populate().then()
function createThenableResult(resolveValue) {
  const thenable = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: (resolve) => Promise.resolve(resolveValue).then(resolve),
    catch: (reject) => Promise.resolve(resolveValue).catch(reject)
  };
  return thenable;
}

// For find().sort().skip().limit().populate() chain
const mockFindChain = {
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  then: undefined,
  catch: undefined
};

// Set the then/catch to resolve to a value
function setFindResult(value) {
  mockFindChain.then = (resolve) => Promise.resolve(value).then(resolve);
  mockFindChain.catch = (reject) => Promise.resolve(value).catch(reject);
}

const mockSave = jest.fn();
const mockPopulate = jest.fn();

// Base listing document factory
function createMockListing(overrides = {}) {
  const defaults = {
    _id: '507f191e810c19729de860ea',
    userId: { _id: '507f191e810c19729de860ea', username: 'testuser' },
    species: 'Tomato',
    variety: 'Cherry',
    quantity: 10,
    price: 5,
    currency: 'EUR',
    category: 'seed',
    description: 'Fresh cherry tomato seeds',
    location: { city: 'Rome', region: 'Lazio', country: 'Italy' },
    images: [],
    isActive: true,
    expiresAt: null,
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    populate: mockPopulate,
    save: mockSave,
    ...overrides
  };
  return defaults;
}

let MockSeedExchangeModel;

jest.mock('../models/SeedExchange', () => {
  const mockModel = jest.fn().mockImplementation((data) => ({
    _id: '507f191e810c19729de860ea',
    ...data,
    save: mockSave,
    populate: mockPopulate
  }));

  mockModel.find = jest.fn().mockReturnValue(mockFindChain);
  mockModel.findById = jest.fn();
  mockModel.findByIdAndUpdate = jest.fn();
  mockModel.findByIdAndDelete = jest.fn();
  mockModel.countDocuments = jest.fn();
  mockModel.create = jest.fn();

  MockSeedExchangeModel = mockModel;
  return mockModel;
});

// Auth middleware mock — no external variable references
jest.mock('../middleware/auth', () => {
  return jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const jwt = jest.requireActual('jsonwebtoken');
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      req.user = { _id: decoded.id, username: decoded.username || 'testuser' };
      req.token = token;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Authentication required' });
    }
  });
});

// ─── App Setup ───────────────────────────────────────────────────────────────

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
const seedExchangeRoutes = require('../routes/seedExchange');
app.use('/api/seed-exchange', seedExchangeRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Test error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: { message: err.message || 'Internal server error', code: 'INTERNAL_ERROR' }
  });
});

// ─── Helper: generate auth token ─────────────────────────────────────────────
const jwt = require('jsonwebtoken');

function getAuthToken(userId = '507f191e810c19729de860ea') {
  return jwt.sign({ id: userId, username: 'testuser' }, process.env.JWT_SECRET);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Seed Exchange API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockReset();
    mockPopulate.mockReset().mockReturnThis();
    MockSeedExchangeModel.findById.mockReset();
    MockSeedExchangeModel.countDocuments.mockReset();

    // Default find chain returns empty array
    setFindResult([]);
  });

  // ─── POST /api/seed-exchange ─────────────────────────────────────────

  describe('POST /api/seed-exchange', () => {
    const validPayload = {
      species: 'Tomato',
      variety: 'Cherry',
      quantity: 10,
      price: 5,
      category: 'seed',
      description: 'Fresh cherry tomato seeds',
      location: { city: 'Rome', region: 'Lazio', country: 'Italy' }
    };

    it('should create a listing and return 201', async () => {
      mockSave.mockResolvedValue(createMockListing());

      const res = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(validPayload)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.species).toBe('Tomato');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/seed-exchange')
        .send(validPayload)
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', 'Bearer invalid-token')
        .send(validPayload)
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({})
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid category', async () => {
      const res = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ ...validPayload, category: 'invalid-cat' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for quantity < 1', async () => {
      const res = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ ...validPayload, quantity: 0 })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for negative price', async () => {
      const res = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ ...validPayload, price: -1 })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for description exceeding 2000 chars', async () => {
      const res = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send({ ...validPayload, description: 'x'.repeat(2001) })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ─── GET /api/seed-exchange ──────────────────────────────────────────

  describe('GET /api/seed-exchange', () => {
    it('should return paginated listings (no auth required)', async () => {
      const mockListing = createMockListing();
      setFindResult([mockListing]);
      MockSeedExchangeModel.countDocuments.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/seed-exchange')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
      expect(res.body.pagination.totalPages).toBe(1);
      expect(res.body.pagination.hasNext).toBe(false);
      expect(res.body.pagination.hasPrev).toBe(false);
    });

    it('should support page and limit parameters', async () => {
      setFindResult([]);
      MockSeedExchangeModel.countDocuments.mockResolvedValue(50);

      const res = await request(app)
        .get('/api/seed-exchange?page=2&limit=10')
        .expect(200);

      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.totalPages).toBe(5);
    });

    it('should cap limit at 100', async () => {
      setFindResult([]);
      MockSeedExchangeModel.countDocuments.mockResolvedValue(500);

      const res = await request(app)
        .get('/api/seed-exchange?limit=999')
        .expect(200);

      expect(res.body.pagination.limit).toBe(100);
    });

    it('should filter by category', async () => {
      setFindResult([]);
      MockSeedExchangeModel.countDocuments.mockResolvedValue(0);

      await request(app)
        .get('/api/seed-exchange?category=seed')
        .expect(200);

      const filterArg = MockSeedExchangeModel.find.mock.calls[0][0];
      expect(filterArg.category).toBe('seed');
    });

    it('should support text search', async () => {
      setFindResult([]);
      MockSeedExchangeModel.countDocuments.mockResolvedValue(0);

      await request(app)
        .get('/api/seed-exchange?search=tomato')
        .expect(200);

      const filterArg = MockSeedExchangeModel.find.mock.calls[0][0];
      expect(filterArg.$or).toBeDefined();
      expect(filterArg.$or.length).toBe(3);
    });

    it('should support sorting by price asc', async () => {
      setFindResult([]);
      MockSeedExchangeModel.countDocuments.mockResolvedValue(0);

      await request(app)
        .get('/api/seed-exchange?sort=price&order=asc')
        .expect(200);

      expect(mockFindChain.sort).toHaveBeenCalledWith({ price: 1 });
    });

    it('should support sorting by createdAt desc (default)', async () => {
      setFindResult([]);
      MockSeedExchangeModel.countDocuments.mockResolvedValue(0);

      await request(app)
        .get('/api/seed-exchange')
        .expect(200);

      expect(mockFindChain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  // ─── GET /api/seed-exchange/:id ──────────────────────────────────────

  describe('GET /api/seed-exchange/:id', () => {
    it('should return listing details', async () => {
      const mockListing = createMockListing();
      // findById returns a thenable with populate().then() chain
      MockSeedExchangeModel.findById.mockReturnValue(
        createThenableResult(mockListing)
      );

      const res = await request(app)
        .get('/api/seed-exchange/507f191e810c19729de860ea')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.species).toBe('Tomato');
    });

    it('should return 400 for invalid ObjectId', async () => {
      const res = await request(app)
        .get('/api/seed-exchange/invalid-id')
        .expect(400);

      expect(res.body.error.code).toBe('INVALID_ID');
    });

    it('should return 404 for non-existent listing', async () => {
      MockSeedExchangeModel.findById.mockReturnValue(
        createThenableResult(null)
      );

      const res = await request(app)
        .get('/api/seed-exchange/507f191e810c19729de860ef')
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ─── PUT /api/seed-exchange/:id ──────────────────────────────────────

  describe('PUT /api/seed-exchange/:id', () => {
    const updatePayload = { price: 8, description: 'Updated description' };

    it('should update listing when owner', async () => {
      const listingWithToString = {
        ...createMockListing(),
        userId: { _id: '507f191e810c19729de860ea', toString: () => '507f191e810c19729de860ea' },
        save: mockSave
      };
      listingWithToString.save = mockSave.mockResolvedValue(listingWithToString);

      MockSeedExchangeModel.findById.mockReturnValue(
        createThenableResult(listingWithToString)
      );
      mockSave.mockResolvedValue(listingWithToString);

      const res = await request(app)
        .put('/api/seed-exchange/507f191e810c19729de860ea')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(updatePayload)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return 403 when non-owner tries to update', async () => {
      const otherUserId = '507f191e810c19729de860eb';
      const listingWithToString = {
        ...createMockListing(),
        userId: { _id: otherUserId, toString: () => otherUserId },
        save: mockSave
      };
      MockSeedExchangeModel.findById.mockReturnValue(
        createThenableResult(listingWithToString)
      );

      const res = await request(app)
        .put('/api/seed-exchange/507f191e810c19729de860ea')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(updatePayload)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .put('/api/seed-exchange/507f191e810c19729de860ea')
        .send(updatePayload)
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    it('should return 404 for non-existent listing', async () => {
      MockSeedExchangeModel.findById.mockReturnValue(
        createThenableResult(null)
      );

      const res = await request(app)
        .put('/api/seed-exchange/507f191e810c19729de860ef')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .send(updatePayload)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ─── DELETE /api/seed-exchange/:id ───────────────────────────────────

  describe('DELETE /api/seed-exchange/:id', () => {
    it('should delete listing when owner', async () => {
      const listingWithToString = {
        ...createMockListing(),
        userId: { _id: '507f191e810c19729de860ea', toString: () => '507f191e810c19729de860ea' }
      };
      MockSeedExchangeModel.findById.mockReturnValue(
        createThenableResult(listingWithToString)
      );
      MockSeedExchangeModel.findByIdAndDelete = jest.fn().mockResolvedValue(listingWithToString);

      const res = await request(app)
        .delete('/api/seed-exchange/507f191e810c19729de860ea')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Listing deleted');
    });

    it('should return 403 when non-owner tries to delete', async () => {
      const otherUserId = '507f191e810c19729de860eb';
      const listingWithToString = {
        ...createMockListing(),
        userId: { _id: otherUserId, toString: () => otherUserId }
      };
      MockSeedExchangeModel.findById.mockReturnValue(
        createThenableResult(listingWithToString)
      );

      const res = await request(app)
        .delete('/api/seed-exchange/507f191e810c19729de860ea')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .delete('/api/seed-exchange/507f191e810c19729de860ea')
        .expect(401);

      expect(res.body.error).toBeDefined();
    });

    it('should return 404 for non-existent listing', async () => {
      MockSeedExchangeModel.findById.mockReturnValue(
        createThenableResult(null)
      );

      const res = await request(app)
        .delete('/api/seed-exchange/507f191e810c19729de860ef')
        .set('Authorization', `Bearer ${getAuthToken()}`)
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
