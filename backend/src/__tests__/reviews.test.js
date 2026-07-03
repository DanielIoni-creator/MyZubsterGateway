const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Review API Tests', () => {
    test('GET /api/reviews - Test base', async () => {
        const response = await request(app)
            .get('/api/reviews');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
    });

    test('POST /api/reviews - Crea recensione (simulato)', async () => {
        const response = await request(app)
            .post('/api/reviews')
            .send({
                targetUserId: 'test_user_123',
                skillId: 'test_skill_456',
                rating: 5,
                comment: 'Test commento'
            });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
    });
});