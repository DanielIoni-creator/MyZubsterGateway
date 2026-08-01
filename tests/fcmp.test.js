// tests/fcmp.test.js
// Unit and Integration Tests for FCMP++ Integration

const request = require('supertest');
const express = require('express');
const FCMPTransactionService = require('../services/fcmpTransactionService');
const { isEnabled, getStatus, getConfig, validateConfig } = require('../services/fcmpConfig');
const fcmpRoutes = require('../routes/fcmp');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/fcmp', fcmpRoutes);

// Valid Monero address for testing (standard 95-char format)
const VALID_MONERO_ADDRESS = '4ApB1WeBNXAmtYZZci5Fi6VK21Zx6RftbPgHzqaAGPqVcCMGafGncYfuwTwyfkXYbtYPsKCdmuprYDLbPkYhmdAm4tK83Xt';

describe('FCMP++ Configuration', () => {
  test('should have FCMP_CONFIG object', () => {
    const config = getConfig();
    expect(config).toBeDefined();
    expect(config.enabled).toBeDefined();
    expect(config.network).toBeDefined();
    expect(config.proofFormat).toBeDefined();
  });

  test('should return isEnabled as boolean', () => {
    const enabled = isEnabled();
    expect(typeof enabled).toBe('boolean');
  });

  test('should validate config', () => {
    const validation = validateConfig();
    expect(validation).toHaveProperty('valid');
    expect(validation).toHaveProperty('errors');
    expect(Array.isArray(validation.errors)).toBe(true);
  });

  test('should get status object', () => {
    const status = getStatus();
    expect(status).toHaveProperty('enabled');
    expect(status).toHaveProperty('network');
    expect(status).toHaveProperty('proofFormat');
    expect(status).toHaveProperty('supportedProofFormats');
    expect(status).toHaveProperty('supportedNetworks');
    expect(Array.isArray(status.supportedProofFormats)).toBe(true);
    expect(Array.isArray(status.supportedNetworks)).toBe(true);
  });
});

describe('FCMPTransactionService', () => {
  let service;

  beforeEach(() => {
    service = new FCMPTransactionService();
  });

  describe('createTransaction', () => {
    test('should create RingCT transaction when FCMP++ disabled', async () => {
      const result = await service.createTransaction({
        destination: VALID_MONERO_ADDRESS,
        amount: 1000000,
        useFCMP: false
      });

      expect(result.success).toBe(true);
      expect(result.proofType).toBe('ringct');
      expect(result.fallback).toBe(false);
      expect(result.transaction).toBeDefined();
      expect(result.transaction.txId).toBeDefined();
      expect(result.transaction.destination).toBeDefined();
      expect(result.transaction.amount).toBe(1000000);
    });

    test('should create FCMP++ transaction when enabled and valid format', async () => {
      // Enable FCMP++ for this test
      const originalEnabled = process.env.FCMP_ENABLED;
      process.env.FCMP_ENABLED = 'true';

      // Recreate service to pick up new config
      service = new FCMPTransactionService();

      try {
        const result = await service.createTransaction({
          destination: VALID_MONERO_ADDRESS,
          amount: 1000000,
          useFCMP: true
        });

        expect(result.success).toBe(true);
        expect(result.proofType).toBe('fcmp');
        expect(result.transaction.proofFormat).toBeDefined();
        expect(result.transaction.proof).toBeDefined();
      } finally {
        // Restore original value
        process.env.FCMP_ENABLED = originalEnabled;
      }
    });

    test('should fallback to RingCT on unsupported proof format', async () => {
      const result = await service.createTransaction({
        destination: VALID_MONERO_ADDRESS,
        amount: 1000000,
        proofFormat: 'invalid-format',
        useFCMP: true
      });

      // With fallback enabled (default), should succeed with RingCT
      expect(result.success).toBe(true);
    });

    test('should generate valid transaction structure', async () => {
      const result = await service.createTransaction({
        destination: VALID_MONERO_ADDRESS,
        amount: 1000000
      });

      expect(result.transaction.txId).toMatch(/^[a-f0-9]{64}$/i);
      expect(result.transaction.timestamp).toBeDefined();
      expect(result.transaction.status).toBe('created');
      expect(result.transaction.fee).toBeGreaterThan(0);
    });
  });

  describe('verifyTransaction', () => {
    test('should verify valid FCMP++ transaction', async () => {
      // Create a valid hex string
      const txId = 'a'.repeat(64);
      const result = await service.verifyTransaction({ txId });

      expect(result.success).toBe(true);
      expect(result.txId).toBe(txId);
      expect(result.verified).toBe(true);
      expect(result.verifiedAt).toBeDefined();
    });

    test('should reject invalid transaction ID', async () => {
      const result = await service.verifyTransaction({ txId: 'invalid' });
      expect(result.success).toBe(true);
      expect(result.verified).toBe(false);
    });
  });

  describe('handleEdgeCase', () => {
    test('should handle ring-size-mismatch', async () => {
      const result = await service.handleEdgeCase('ring-size-mismatch', {});
      expect(result.success).toBe(true);
      expect(result.resolution).toBeDefined();
    });

    test('should handle proof-format-incompatible', async () => {
      const result = await service.handleEdgeCase('proof-format-incompatible', { proofFormat: 'invalid' });
      expect(result.success).toBe(true);
      expect(result.resolution).toBeDefined();
    });

    test('should handle network-activation-pending', async () => {
      const result = await service.handleEdgeCase('network-activation-pending', { currentHeight: 1000000 });
      expect(result.success).toBe(true);
      expect(result.resolution).toBeDefined();
    });

    test('should handle fallback-to-ringct', async () => {
      const result = await service.handleEdgeCase('fallback-to-ringct', { reason: 'test' });
      expect(result.success).toBe(true);
      expect(result.resolution).toBeDefined();
    });

    test('should reject unknown edge case', async () => {
      const result = await service.handleEdgeCase('unknown-case', {});
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('FCMP++ API Routes', () => {
  describe('POST /api/fcmp/transaction/create', () => {
    test('should create transaction with valid params', async () => {
      const res = await request(app)
        .post('/api/fcmp/transaction/create')
        .send({
          destination: VALID_MONERO_ADDRESS,
          amount: 1000000
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction).toBeDefined();
    });

    test('should reject invalid destination address', async () => {
      const res = await request(app)
        .post('/api/fcmp/transaction/create')
        .send({
          destination: 'invalid-address',
          amount: 1000000
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    test('should reject negative amount', async () => {
      const res = await request(app)
        .post('/api/fcmp/transaction/create')
        .send({
          destination: VALID_MONERO_ADDRESS,
          amount: -100
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/fcmp/transaction/create')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    test('should accept optional paymentId', async () => {
      const res = await request(app)
        .post('/api/fcmp/transaction/create')
        .send({
          destination: VALID_MONERO_ADDRESS,
          amount: 1000000,
          paymentId: 'a'.repeat(64)
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('should reject invalid paymentId format', async () => {
      const res = await request(app)
        .post('/api/fcmp/transaction/create')
        .send({
          destination: VALID_MONERO_ADDRESS,
          amount: 1000000,
          paymentId: 'invalid'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/fcmp/transaction/:txId/verify', () => {
    test('should verify transaction with valid txId', async () => {
      const txId = 'a'.repeat(64);
      const res = await request(app)
        .get(`/api/fcmp/transaction/${txId}/verify`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.txId).toBe(txId);
      expect(res.body.data.verified).toBeDefined();
    });

    test('should reject invalid txId format', async () => {
      const res = await request(app)
        .get('/api/fcmp/transaction/invalid/verify');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should accept optional proofFormat query param', async () => {
      const txId = 'a'.repeat(64);
      const res = await request(app)
        .get(`/api/fcmp/transaction/${txId}/verify`)
        .query({ proofFormat: 'fcmp-plus-plus' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/fcmp/status', () => {
    test('should return FCMP++ status', async () => {
      const res = await request(app)
        .get('/api/fcmp/status');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enabled).toBeDefined();
      expect(res.body.data.network).toBeDefined();
      expect(res.body.data.proofFormat).toBeDefined();
      expect(Array.isArray(res.body.data.supportedProofFormats)).toBe(true);
    });
  });

  describe('GET /api/fcmp/config', () => {
    test('should return FCMP++ configuration', async () => {
      const res = await request(app)
        .get('/api/fcmp/config');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.enabled).toBeDefined();
      expect(res.body.data.validation).toBeDefined();
    });
  });

  describe('POST /api/fcmp/edge-case/handle', () => {
    test('should handle ring-size-mismatch edge case', async () => {
      const res = await request(app)
        .post('/api/fcmp/edge-case/handle')
        .send({ edgeCase: 'ring-size-mismatch' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resolution).toBeDefined();
    });

    test('should handle proof-format-incompatible edge case', async () => {
      const res = await request(app)
        .post('/api/fcmp/edge-case/handle')
        .send({ edgeCase: 'proof-format-incompatible', params: { proofFormat: 'invalid' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should handle network-activation-pending edge case', async () => {
      const res = await request(app)
        .post('/api/fcmp/edge-case/handle')
        .send({ edgeCase: 'network-activation-pending', params: { currentHeight: 1000000 } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should handle fallback-to-ringct edge case', async () => {
      const res = await request(app)
        .post('/api/fcmp/edge-case/handle')
        .send({ edgeCase: 'fallback-to-ringct', params: { reason: 'test' } });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('should reject invalid edge case', async () => {
      const res = await request(app)
        .post('/api/fcmp/edge-case/handle')
        .send({ edgeCase: 'invalid-case' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject missing edgeCase', async () => {
      const res = await request(app)
        .post('/api/fcmp/edge-case/handle')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
