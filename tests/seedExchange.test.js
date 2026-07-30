const express = require('express');
const request = require('supertest');

const OWNER_ID = '000000000000000000000123';
const OTHER_OWNER_ID = '000000000000000000000456';

jest.mock('../middleware/auth', () => (req, res, next) => {
  if (req.get('Authorization') !== 'Bearer seed-token') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = { _id: OWNER_ID, id: OWNER_ID };
  return next();
});

const makeListQuery = (rows) => {
  const query = {
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn(async () => rows),
  };
  return query;
};

jest.mock('../models/SeedExchange', () => ({
  create: jest.fn(async (document) => ({
    _id: 'listing-1',
    createdAt: new Date('2026-07-30T13:15:00.000Z'),
    updatedAt: new Date('2026-07-30T13:15:00.000Z'),
    ...document,
  })),
  find: jest.fn(),
  findById: jest.fn(),
}));

const SeedExchange = require('../models/SeedExchange');
const seedExchangeRoutes = require('../routes/seedExchange');

describe('seed exchange API', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/seed-exchange', seedExchangeRoutes);
  });

  it('requires JWT authentication when creating a listing', async () => {
    await request(app)
      .post('/api/seed-exchange')
      .send({
        plantName: 'Tomato',
        type: 'seeds',
        quantity: 20,
        exchangeType: 'free',
      })
      .expect(401);

    expect(SeedExchange.create).not.toHaveBeenCalled();
  });

  it('creates a validated listing for the authenticated owner', async () => {
    const response = await request(app)
      .post('/api/seed-exchange')
      .set('Authorization', 'Bearer seed-token')
      .send({
        pianta: ' Pomodoro San Marzano ',
        varieta: 'Classico',
        tipo: 'semi',
        quantita: '25',
        posizione: ' Milano ',
        disponibilita: 'stagionale',
        tipoScambio: 'baratto',
        descrizione: 'Semi del raccolto estivo',
      })
      .expect(201);

    expect(SeedExchange.create).toHaveBeenCalledWith({
      userId: OWNER_ID,
      plantName: 'Pomodoro San Marzano',
      variety: 'Classico',
      type: 'seeds',
      quantity: 25,
      location: 'Milano',
      availability: 'seasonal',
      exchangeType: 'barter',
      description: 'Semi del raccolto estivo',
    });
    expect(response.body.data).toEqual(expect.objectContaining({
      plantName: 'Pomodoro San Marzano',
      variety: 'Classico',
      type: 'seeds',
      quantity: 25,
    }));
  });

  it.each([
    ['seed', 'seeds'],
    ['cuttings', 'cuttings'],
    ['piantina', 'seedlings'],
    ['bulbo', 'bulbs'],
  ])('normalizes %s to the canonical %s material type', async (input, expected) => {
    await request(app)
      .post('/api/seed-exchange')
      .set('Authorization', 'Bearer seed-token')
      .send({
        plantName: 'Test plant',
        type: input,
        quantity: 1,
      })
      .expect(201);

    expect(SeedExchange.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: OWNER_ID,
      type: expected,
      variety: '',
      availability: 'immediate',
      exchangeType: 'free',
      description: '',
    }));
    expect(SeedExchange.create.mock.calls[0][0]).not.toHaveProperty('location');
  });

  it('rejects invalid quantities and enum values', async () => {
    const response = await request(app)
      .post('/api/seed-exchange')
      .set('Authorization', 'Bearer seed-token')
      .send({
        plantName: 'Basil',
        type: 'spores',
        quantity: 0,
        availability: 'later',
        exchangeType: 'swap',
      })
      .expect(400);

    expect(response.body.errors).toEqual(expect.arrayContaining([
      'type must be seeds, cuttings, seedlings, or bulbs',
      'quantity must be an integer between 1 and 1000000',
      'availability must be immediate or seasonal',
      'exchangeType must be free, barter, or donation',
    ]));
    expect(SeedExchange.create).not.toHaveBeenCalled();
  });

  it('rejects boolean, fractional, and structured quantities instead of coercing them', async () => {
    for (const quantity of [true, 1.5, { value: 1 }, [1]]) {
      await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', 'Bearer seed-token')
        .send({
          plantName: 'Basil',
          type: 'seeds',
          quantity,
        })
        .expect(400);
    }

    expect(SeedExchange.create).not.toHaveBeenCalled();
  });

  it('lists announcements with plant, type, and location filters', async () => {
    const rows = [
      {
        _id: 'listing-1',
        userId: OWNER_ID,
        plantName: 'Tomato',
        type: 'seeds',
        quantity: 20,
        location: 'Milano',
        availability: 'immediate',
        exchangeType: 'free',
      },
    ];
    const query = makeListQuery(rows);
    SeedExchange.find.mockReturnValue(query);

    const response = await request(app)
      .get('/api/seed-exchange?pianta=Tom.&tipo=semi&posizione=Milano&page=2&limit=10')
      .expect(200);

    const filter = SeedExchange.find.mock.calls[0][0];
    expect(filter.type).toBe('seeds');
    expect(filter.plantName.$regex).toBe('Tom\\.');
    expect(filter.plantName.$options).toBe('i');
    expect(filter.location.$regex).toBe('Milano');
    expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(response.body.data).toHaveLength(1);
  });

  it('rejects ambiguous or unsafe pagination values', async () => {
    await request(app)
      .get('/api/seed-exchange?page=2abc')
      .expect(400);

    await request(app)
      .get('/api/seed-exchange?page=1000001')
      .expect(400);

    expect(SeedExchange.find).not.toHaveBeenCalled();
  });

  it('returns one public listing by id', async () => {
    SeedExchange.findById.mockReturnValue({
      lean: jest.fn(async () => ({
        _id: 'listing-1',
        userId: OWNER_ID,
        plantName: 'Basil',
        type: 'cuttings',
        quantity: 4,
        location: 'Roma',
        availability: 'immediate',
        exchangeType: 'free',
      })),
    });

    const response = await request(app)
      .get('/api/seed-exchange/listing-1')
      .expect(200);

    expect(response.body.data).toEqual(expect.objectContaining({
      id: 'listing-1',
      plantName: 'Basil',
      type: 'cuttings',
    }));
  });

  it('allows only the owner to update a listing', async () => {
    const listing = {
      _id: 'listing-1',
      userId: OWNER_ID,
      plantName: 'Basil',
      type: 'cuttings',
      quantity: 4,
      location: 'Roma',
      availability: 'immediate',
      exchangeType: 'free',
      description: '',
      save: jest.fn(async () => undefined),
    };
    SeedExchange.findById.mockResolvedValue(listing);

    const response = await request(app)
      .put('/api/seed-exchange/listing-1')
      .set('Authorization', 'Bearer seed-token')
      .send({
        quantity: 8,
        posizione: 'Milano',
        userId: OTHER_OWNER_ID,
      })
      .expect(200);

    expect(listing.quantity).toBe(8);
    expect(listing.location).toBe('Milano');
    expect(listing.userId).toBe(OWNER_ID);
    expect(listing.save).toHaveBeenCalledTimes(1);
    expect(response.body.data.quantity).toBe(8);
  });

  it('rejects updates from a different owner', async () => {
    SeedExchange.findById.mockResolvedValue({
      _id: 'listing-1',
      userId: OTHER_OWNER_ID,
      plantName: 'Basil',
      type: 'seeds',
      quantity: 4,
      location: 'Roma',
      availability: 'immediate',
      exchangeType: 'free',
      save: jest.fn(),
    });

    await request(app)
      .put('/api/seed-exchange/listing-1')
      .set('Authorization', 'Bearer seed-token')
      .send({ quantity: 8 })
      .expect(403);
  });

  it('keeps update and delete protected by JWT', async () => {
    await request(app)
      .put('/api/seed-exchange/listing-1')
      .send({ quantity: 8 })
      .expect(401);

    await request(app)
      .delete('/api/seed-exchange/listing-1')
      .expect(401);

    expect(SeedExchange.findById).not.toHaveBeenCalled();
  });

  it('returns 404 when a requested listing does not exist', async () => {
    SeedExchange.findById.mockReturnValue({
      lean: jest.fn(async () => null),
    });

    await request(app)
      .get('/api/seed-exchange/missing-listing')
      .expect(404);
  });

  it('returns 400 for a malformed MongoDB id', async () => {
    const error = new Error('Cast to ObjectId failed');
    error.name = 'CastError';
    SeedExchange.findById.mockReturnValue({
      lean: jest.fn(async () => {
        throw error;
      }),
    });

    await request(app)
      .get('/api/seed-exchange/not-an-object-id')
      .expect(400);
  });

  it('allows only the owner to delete a listing', async () => {
    const listing = {
      _id: 'listing-1',
      userId: OWNER_ID,
      deleteOne: jest.fn(async () => undefined),
    };
    SeedExchange.findById.mockResolvedValue(listing);

    await request(app)
      .delete('/api/seed-exchange/listing-1')
      .set('Authorization', 'Bearer seed-token')
      .expect(204);

    expect(listing.deleteOne).toHaveBeenCalledTimes(1);
  });

  it('rejects deletion by a different owner', async () => {
    SeedExchange.findById.mockResolvedValue({
      _id: 'listing-1',
      userId: OTHER_OWNER_ID,
      deleteOne: jest.fn(),
    });

    await request(app)
      .delete('/api/seed-exchange/listing-1')
      .set('Authorization', 'Bearer seed-token')
      .expect(403);
  });
});
