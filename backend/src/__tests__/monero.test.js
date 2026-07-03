const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../index');
const PaymentTransaction = require('../models/PaymentTransaction');
const { MoneroClient } = require('../payment/moneroClient');
const { loadPaymentConfig } = require('../payment/config');

let mongoServer;
let authToken;
let testUser;
let moneroClient;

beforeAll(async () => {
    // Avvia MongoDB in memoria per i test
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Crea un utente di test
    const User = require('../models/User');
    testUser = await User.create({
        username: 'monerouser',
        email: 'monero@example.com',
        password: 'password123',
        name: 'Monero Test User',
        moneroAddress: '4ABC123...'
    });

    // Login per ottenere il token
    const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
            email: 'monero@example.com',
            password: 'password123'
        });
    authToken = loginResponse.body.token;

    // Inizializza il client Monero (con configurazione di test)
    const config = loadPaymentConfig({
        MONERO_WALLET_RPC_URL: 'http://127.0.0.1:38082/json_rpc',
        MONERO_NODE_URL: 'http://127.0.0.1:18081/json_rpc',
        MONERO_CONFIRMATIONS_DEFAULT: '0'
    });
    moneroClient = new MoneroClient(config);
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

describe('Monero Payment Tests', () => {

    // ============================================
    // TEST CREAZIONE PAGAMENTO
    // ============================================

    test('POST /api/payment/create - Crea richiesta di pagamento', async () => {
        const response = await request(app)
            .post('/api/payment/create')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                amount: 0.5,
                sellerId: testUser._id.toString(),
                description: 'Test payment'
            });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('paymentId');
        expect(response.body).toHaveProperty('moneroAddress');
        expect(response.body).toHaveProperty('amount', 0.5);
        expect(response.body).toHaveProperty('status', 'pending');
    });

    test('POST /api/payment/create - Rifiuta importo negativo', async () => {
        const response = await request(app)
            .post('/api/payment/create')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                amount: -1,
                sellerId: testUser._id.toString()
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    test('POST /api/payment/create - Rifiuta senza sellerId', async () => {
        const response = await request(app)
            .post('/api/payment/create')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                amount: 1
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    // ============================================
    // TEST VERIFICA STATO PAGAMENTO
    // ============================================

    test('GET /api/payment/status/:paymentId - Recupera stato pagamento', async () => {
        // Crea prima un pagamento
        const createResponse = await request(app)
            .post('/api/payment/create')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                amount: 0.5,
                sellerId: testUser._id.toString()
            });

        const paymentId = createResponse.body.paymentId;

        const response = await request(app)
            .get(`/api/payment/status/${paymentId}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('paymentId', paymentId);
        expect(response.body).toHaveProperty('status');
        expect(['pending', 'detected', 'confirmed']).toContain(response.body.status);
    });

    test('GET /api/payment/status/:paymentId - Pagamento non trovato', async () => {
        const response = await request(app)
            .get('/api/payment/status/invalid-payment-id');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');
    });

    // ============================================
    // TEST INTEGRAZIONE WALLET RPC
    // ============================================

    test('MoneroClient - Crea indirizzo di pagamento', async () => {
        const result = await moneroClient.createPaymentAddress({
            label: 'test-address'
        });

        expect(result).toHaveProperty('address');
        expect(result.address).toMatch(/^4/); // Gli indirizzi Monero iniziano con 4
        expect(result).toHaveProperty('subaddressIndex');
    });

    test('MoneroClient - Check payment status', async () => {
        const result = await moneroClient.checkPayment({
            address: '4ABC123...',
            amountAtomic: '1000000000000'
        });

        expect(result).toHaveProperty('status');
        expect(['pending', 'detected', 'confirmed']).toContain(result.status);
        expect(result).toHaveProperty('paidAtomic');
        expect(result).toHaveProperty('confirmations');
    });

    // ============================================
    // TEST COMMISSIONE
    // ============================================

    test('Payment - Calcola commissione del 2%', async () => {
        const amount = 10;
        const feeRate = 0.02;
        const expectedFee = amount * feeRate;
        const expectedNet = amount - expectedFee;

        expect(expectedFee).toBe(0.2);
        expect(expectedNet).toBe(9.8);
    });

    test('POST /api/payment/create - Commissione inclusa nel response', async () => {
        const response = await request(app)
            .post('/api/payment/create')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                amount: 10,
                sellerId: testUser._id.toString()
            });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('feeAmount');
        expect(response.body.feeAmount).toBe(0.2);
        expect(response.body).toHaveProperty('netAmount');
        expect(response.body.netAmount).toBe(9.8);
    });

    // ============================================
    // TEST PAYMENT TRANSACTION MODEL
    // ============================================

    test('PaymentTransaction - Crea transazione nel DB', async () => {
        const transaction = await PaymentTransaction.create({
            paymentId: 'test-payment-123',
            amount: 1.5,
            amountAtomic: '1500000000000',
            sellerId: testUser._id,
            status: 'pending',
            moneroAddress: '4TestAddress...',
            paidAtomic: '0',
            paidXmr: '0',
            requiredConfirmations: 0,
            confirmations: 0,
            txIds: [],
            description: 'Test DB transaction'
        });

        expect(transaction).toHaveProperty('paymentId', 'test-payment-123');
        expect(transaction).toHaveProperty('amount', 1.5);
        expect(transaction).toHaveProperty('status', 'pending');
        expect(transaction).toHaveProperty('createdAt');
    });

    // ============================================
    // TEST FLUSSO COMPLETO (simulato)
    // ============================================

    test('Flusso completo - Crea e verifica pagamento', async () => {
        // 1. Crea pagamento
        const createResponse = await request(app)
            .post('/api/payment/create')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                amount: 0.5,
                sellerId: testUser._id.toString()
            });

        expect(createResponse.status).toBe(201);
        const paymentId = createResponse.body.paymentId;

        // 2. Verifica stato iniziale (pending)
        const statusResponse1 = await request(app)
            .get(`/api/payment/status/${paymentId}`);

        expect(statusResponse1.status).toBe(200);
        expect(statusResponse1.body.status).toBe('pending');

        // 3. Simula conferma pagamento (via webhook)
        const webhookResponse = await request(app)
            .post('/api/payment/webhook')
            .send({
                paymentId: paymentId,
                status: 'confirmed',
                txIds: ['tx123']
            });

        expect(webhookResponse.status).toBe(200);

        // 4. Verifica stato aggiornato
        const statusResponse2 = await request(app)
            .get(`/api/payment/status/${paymentId}`);

        expect(statusResponse2.status).toBe(200);
        expect(statusResponse2.body.status).toBe('confirmed');
    });
});