const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');
const User = require('../models/User');

let mongoServer;
let authToken;
let testUser;

beforeAll(async () => {
    // Avvia MongoDB in memoria per i test
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Crea un utente di test
    testUser = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'user'
    });

    // Genera un token per l'autenticazione
    const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
            email: 'test@example.com',
            password: 'password123'
        });
    authToken = loginResponse.body.token;
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('User API Tests', () => {

    // ============================================
    // TEST REGISTRAZIONE
    // ============================================

    test('POST /api/users/register - Registra un nuovo utente', async () => {
        const response = await request(app)
            .post('/api/users/register')
            .send({
                username: 'newuser',
                email: 'newuser@example.com',
                password: 'password123',
                name: 'New User'
            });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.user).toHaveProperty('username', 'newuser');
        expect(response.body.user).toHaveProperty('email', 'newuser@example.com');
        expect(response.body).toHaveProperty('token');
    });

    test('POST /api/users/register - Rifiuta registrazione con email duplicata', async () => {
        const response = await request(app)
            .post('/api/users/register')
            .send({
                username: 'testuser2',
                email: 'test@example.com', // Email già esistente
                password: 'password123'
            });

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error');
    });

    test('POST /api/users/register - Rifiuta registrazione senza password', async () => {
        const response = await request(app)
            .post('/api/users/register')
            .send({
                username: 'nopassword',
                email: 'nopassword@example.com'
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    // ============================================
    // TEST LOGIN
    // ============================================

    test('POST /api/auth/login - Login con credenziali corrette', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toHaveProperty('username', 'testuser');
    });

    test('POST /api/auth/login - Rifiuta login con password errata', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
    });

    test('POST /api/auth/login - Rifiuta login con email inesistente', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'nonexistent@example.com',
                password: 'password123'
            });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
    });

    // ============================================
    // TEST PROFILO UTENTE
    // ============================================

    test('GET /api/users/profile - Recupera profilo utente loggato', async () => {
        const response = await request(app)
            .get('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.user).toHaveProperty('username', 'testuser');
        expect(response.body.user).toHaveProperty('email', 'test@example.com');
    });

    test('GET /api/users/profile - Rifiuta accesso senza token', async () => {
        const response = await request(app)
            .get('/api/users/profile');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
    });

    test('GET /api/users/:userId - Recupera profilo pubblico di un utente', async () => {
        const response = await request(app)
            .get(`/api/users/${testUser._id}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.user).toHaveProperty('username', 'testuser');
    });

    // ============================================
    // TEST AGGIORNAMENTO PROFILO
    // ============================================

    test('PUT /api/users/profile - Aggiorna profilo utente', async () => {
        const response = await request(app)
            .put('/api/users/profile')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                name: 'Updated Name',
                bio: 'Nuova biografia di test',
                location: 'Rimini'
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.user).toHaveProperty('name', 'Updated Name');
        expect(response.body.user).toHaveProperty('bio', 'Nuova biografia di test');
    });

    test('PUT /api/users/profile - Rifiuta aggiornamento senza token', async () => {
        const response = await request(app)
            .put('/api/users/profile')
            .send({
                name: 'Hacker'
            });

        expect(response.status).toBe(401);
    });

    // ============================================
    // TEST CANCELLAZIONE UTENTE
    // ============================================

    test('DELETE /api/users/profile - Elimina account utente', async () => {
        // Crea un utente temporaneo per il test di eliminazione
        const tempUser = await User.create({
            username: 'tempuser',
            email: 'temp@example.com',
            password: 'password123'
        });

        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'temp@example.com',
                password: 'password123'
            });

        const tempToken = loginResponse.body.token;

        const response = await request(app)
            .delete('/api/users/profile')
            .set('Authorization', `Bearer ${tempToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);

        // Verifica che l'utente sia stato eliminato
        const deletedUser = await User.findOne({ email: 'temp@example.com' });
        expect(deletedUser).toBeNull();
    });

    // ============================================
    // TEST AMMINISTRAZIONE (SOLO ADMIN)
    // ============================================

    test('GET /api/admin/users - Lista utenti (solo admin)', async () => {
        // Crea un admin
        const admin = await User.create({
            username: 'adminuser',
            email: 'admin@example.com',
            password: 'admin123',
            role: 'admin'
        });

        const adminLogin = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'admin@example.com',
                password: 'admin123'
            });

        const adminToken = adminLogin.body.token;

        const response = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('GET /api/admin/users - Rifiuta a utente non admin', async () => {
        const response = await request(app)
            .get('/api/admin/users')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(403);
    });
});