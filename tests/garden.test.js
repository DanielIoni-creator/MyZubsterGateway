const express = require('express');
const request = require('supertest');

const USER_ID = '000000000000000000000123';

jest.mock('../middleware/auth', () => (req, res, next) => {
  if (req.get('Authorization') !== 'Bearer garden-token') {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = { _id: USER_ID, id: USER_ID };
  return next();
});

const makeFindQuery = (rows) => {
  const query = {
    sort: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn(async () => rows),
  };
  return query;
};

jest.mock('../models/GardenReading', () => ({
  create: jest.fn(async (document) => ({
    _id: 'reading-1',
    receivedAt: new Date('2026-07-30T11:30:00.000Z'),
    ...document,
  })),
  find: jest.fn(),
}));

const GardenReading = require('../models/GardenReading');
const gardenRoutes = require('../routes/garden');

describe('garden sensor API', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/garden', gardenRoutes);
  });

  it('requires JWT authentication before accepting Arduino readings', async () => {
    await request(app)
      .post('/api/garden/data')
      .send({
        gardenId: 'garden-1',
        ph: 6.2,
        ec: 1.8,
        temperature: 22.5,
        humidity: 65,
      })
      .expect(401);

    expect(GardenReading.create).not.toHaveBeenCalled();
  });

  it('stores a validated garden sensor reading for the authenticated garden owner', async () => {
    const response = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({
        gardenId: ' garden-1 ',
        ph: '6.2',
        ec: 1.8,
        temperature: 22.5,
        humidity: 65,
      })
      .expect(201);

    expect(GardenReading.create).toHaveBeenCalledWith({
      owner: USER_ID,
      gardenId: 'garden-1',
      ph: 6.2,
      ec: 1.8,
      temperature: 22.5,
      humidity: 65,
    });
    expect(response.body).toEqual(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        gardenId: 'garden-1',
        ph: 6.2,
        humidity: 65,
      }),
    }));
  });

  it('rejects invalid sensor readings with field-level messages', async () => {
    const response = await request(app)
      .post('/api/garden/data')
      .set('Authorization', 'Bearer garden-token')
      .send({
        gardenId: '',
        ph: 18,
        ec: -1,
        temperature: 120,
        humidity: 101,
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.errors).toEqual(expect.arrayContaining([
      'gardenId is required',
      'ph must be a number between 0 and 14',
      'ec must be a non-negative number',
    ]));
    expect(GardenReading.create).not.toHaveBeenCalled();
  });

  it('returns historical readings and summary stats for one authenticated garden', async () => {
    const rows = [
      {
        _id: 'reading-2',
        gardenId: 'garden-1',
        ph: 6.6,
        ec: 2,
        temperature: 24,
        humidity: 70,
        receivedAt: new Date('2026-07-30T11:35:00.000Z'),
      },
      {
        _id: 'reading-1',
        gardenId: 'garden-1',
        ph: 6.2,
        ec: 1.8,
        temperature: 22,
        humidity: 60,
        receivedAt: new Date('2026-07-30T11:30:00.000Z'),
      },
    ];
    const query = makeFindQuery(rows);
    GardenReading.find.mockReturnValue(query);

    const response = await request(app)
      .get('/api/garden/garden-1/stats?limit=50&from=2026-07-30T00:00:00Z')
      .set('Authorization', 'Bearer garden-token')
      .expect(200);

    expect(GardenReading.find).toHaveBeenCalledWith({
      owner: USER_ID,
      gardenId: 'garden-1',
      receivedAt: { $gte: new Date('2026-07-30T00:00:00Z') },
    });
    expect(query.sort).toHaveBeenCalledWith({ receivedAt: -1 });
    expect(query.limit).toHaveBeenCalledWith(50);
    expect(response.body.data.stats).toEqual(expect.objectContaining({
      count: 2,
      averages: expect.objectContaining({
        ph: 6.4,
        ec: 1.9,
        temperature: 23,
        humidity: 65,
      }),
    }));
    expect(response.body.data.readings).toHaveLength(2);
  });
});
