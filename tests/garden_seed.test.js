// tests/garden_seed.test.js
const request = require('supertest');
const app = require('../server');
const jwtService = require('../services/jwtService');

describe('Arduino Sensor Data & Seed Exchange Export APIs', () => {
  let authToken;

  beforeAll(() => {
    authToken = jwtService.generateToken({
      userId: '507f1f77bcf86cd799439011',
      email: 'test@myzubster.com',
      role: 'user'
    });
  });

  describe('Arduino Garden Sensor Data API (#144)', () => {
    test('POST /api/garden/data rejects unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/garden/data')
        .send({ pH: 6.5, EC: 1.2, temperature: 24.5, humidity: 65 });
      expect(res.statusCode).toBe(401);
    });

    test('POST /api/garden/data validates required fields', async () => {
      const res = await request(app)
        .post('/api/garden/data')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pH: 6.5 });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('Missing required sensor fields');
    });

    test('POST /api/garden/data records valid sensor data', async () => {
      const res = await request(app)
        .post('/api/garden/data')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          gardenId: 'garden-alpha',
          pH: 6.8,
          EC: 1.5,
          temperature: 25.0,
          humidity: 70.0
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pH).toBe(6.8);
      expect(res.body.data.gardenId).toBe('garden-alpha');
    });

    test('GET /api/garden/:id/stats calculates stats and returns history', async () => {
      const res = await request(app)
        .get('/api/garden/garden-alpha/stats')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.gardenId).toBe('garden-alpha');
      expect(res.body.totalReadings).toBeGreaterThanOrEqual(1);
      expect(res.body.stats.pH.avg).toBeDefined();
    });
  });

  describe('Seed Exchange CSV & GeoJSON Export API (#109)', () => {
    test('POST /api/seed-exchange creates listing', async () => {
      const res = await request(app)
        .post('/api/seed-exchange')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plant: 'Tomato',
          variety: 'Roma',
          type: 'seed',
          quantity: 10,
          exchangeType: 'swap',
          locationName: 'Singapore Central Garden',
          coordinates: [103.851959, 1.290270],
          notes: 'Heirloom tomato seeds'
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.data.plant).toBe('Tomato');
    });

    test('GET /api/seed-exchange/export/csv exports CSV format', async () => {
      const res = await request(app)
        .get('/api/seed-exchange/export/csv?plant=Tomato');
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('Plant,Variety,Type,Quantity');
      expect(res.text).toContain('Tomato');
    });

    test('GET /api/seed-exchange/export/geojson exports GeoJSON format', async () => {
      const res = await request(app)
        .get('/api/seed-exchange/export/geojson?type=seed');
      expect(res.statusCode).toBe(200);
      expect(res.body.type).toBe('FeatureCollection');
      expect(Array.isArray(res.body.features)).toBe(true);
      expect(res.body.features.length).toBeGreaterThanOrEqual(1);
      expect(res.body.features[0].geometry.type).toBe('Point');
    });
  });
});
