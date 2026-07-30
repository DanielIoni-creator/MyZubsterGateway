/**
 * AI Multisig Agent — Unit Tests
 *
 * Tests cover:
 *  - Constructor & config loading
 *  - Key management & ed25519 signing
 *  - AI API integration (mocked)
 *  - Rule-based fallback
 *  - signRelease / rejectRelease
 *  - processWebhook end-to-end
 *  - Decision logging
 *  - Status reporting
 */

jest.mock('axios');
jest.mock('../../../models/AIDecisionLog', () => {
  // Reusable chainable query builder
  const makeQuery = (resolvedValue) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolvedValue),
  });

  const mockCreate = jest.fn().mockImplementation((doc) =>
    Promise.resolve({ _id: 'mock-decision-id', ...doc })
  );

  const mockFind = jest.fn().mockImplementation((filter) =>
    makeQuery([
      {
        _id: 'mock-decision-id',
        orderId: filter && filter.orderId
          ? { _id: filter.orderId, orderNumber: 1, status: 'completed', totalPrice: 100 }
          : { _id: 'order123', orderNumber: 1, status: 'completed', totalPrice: 100 },
        action: 'sign',
        statusCode: 'approved',
        confidence: 0.85,
        createdAt: new Date(),
      },
    ])
  );

  const mockCountDocuments = jest.fn().mockImplementation((filter) => {
    if (filter && filter.action === 'sign') return Promise.resolve(5);
    if (filter && filter.action === 'reject') return Promise.resolve(2);
    if (filter && filter.action === 'pending') return Promise.resolve(1);
    return Promise.resolve(8);
  });

  const mockFindOne = jest.fn().mockReturnValue(makeQuery({
    _id: 'last-decision',
    orderId: 'order123',
    action: 'sign',
    statusCode: 'approved',
    confidence: 0.85,
    createdAt: new Date(),
  }));

  return {
    create: mockCreate,
    find: mockFind,
    findOne: mockFindOne,
    countDocuments: mockCountDocuments,
  };
});

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AIDecisionLog = require('../../../models/AIDecisionLog');
const AiMultisigAgent = require('../../../services/aiMultisigAgent');

// ──────────────────────── Helpers ──────────────────────────────

function createAgent(configOverrides = {}) {
  // Write a temporary config for testing
  const configDir = path.resolve(__dirname, '..', '..', '..', 'config');
  const configPath = path.join(configDir, 'ai-agent.test.json');
  const defaultConfig = {
    aiProvider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.3,
    maxTokens: 2000,
    apiKeyEnvVar: 'AI_AGENT_API_KEY',
    aiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    moneroKeyEnvVar: 'AI_AGENT_MONERO_KEY',
    moneroPublicAddress: '',
    webhookEndpoint: '/api/ai/webhook',
    decisionLogging: true,
    minConfirmations: 10,
    confidenceThreshold: 0.7,
    agentId: 'test-agent-001',
    version: '1.0.0',
    ...configOverrides,
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  const agent = new AiMultisigAgent(configPath);
  // Clean up temp config
  try { fs.unlinkSync(configPath); } catch {}
  return agent;
}

// ──────────────────────── Tests ───────────────────────────────

describe('AiMultisigAgent', () => {
  let agent;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeAll(() => {
    process.env.AI_AGENT_API_KEY = 'test-deepseek-key-12345';
    process.env.AI_AGENT_MONERO_KEY = 'aabbccddee'.repeat(6); // 60 hex chars
  });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    agent = createAgent();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  afterAll(() => {
    delete process.env.AI_AGENT_API_KEY;
    delete process.env.AI_AGENT_MONERO_KEY;
  });

  // ────── 1. Constructor ──────

  test('1. Constructor loads config correctly', () => {
    expect(agent.config).toBeDefined();
    expect(agent.config.agentId).toBe('test-agent-001');
    expect(agent.config.aiProvider).toBe('deepseek');
    expect(agent.config.model).toBe('deepseek-chat');
    expect(agent.config.confidenceThreshold).toBe(0.7);
  });

  test('2. Constructor reads API key from environment', () => {
    expect(agent.apiKey).toBe('test-deepseek-key-12345');
    expect(agent.moneroPrivateKeyHex).toBe('aabbccddee'.repeat(6));
  });

  test('3. Constructor generates or loads ed25519 key pair', () => {
    expect(agent.keyPair).toBeDefined();
    expect(agent.keyPair.publicKey).toBeDefined();
    expect(agent.keyPair.privateKey).toBeDefined();
    expect(agent.publicKeyHex).toBeDefined();
    expect(agent.publicKeyHex.length).toBeGreaterThan(0);
    expect(agent.agentAddress).toBeDefined();
    expect(agent.agentAddress).toMatch(/^AI_/);
  });

  test('4. Constructor works without config file (uses defaults)', () => {
    delete process.env.AI_AGENT_API_KEY;
    const noKeyAgent = new AiMultisigAgent('/nonexistent/path.json');
    expect(noKeyAgent.config).toBeDefined();
    expect(noKeyAgent.config.agentId).toBe('ai-multisig-agent-001');
    expect(noKeyAgent.apiKey).toBeNull();
    process.env.AI_AGENT_API_KEY = 'test-deepseek-key-12345'; // restore
  });

  // ────── 2. Key Management & Signing ──────

  test('5. _signMessage creates a valid ed25519 signature', () => {
    const message = 'order123:RELEASE:1234567890';
    const sigResult = agent._signMessage(message);

    expect(sigResult).toBeDefined();
    expect(sigResult.signature).toBeDefined();
    expect(sigResult.signatureHex).toBeDefined();
    expect(sigResult.publicKey).toBe(agent.publicKeyHex);
    expect(sigResult.agentAddress).toBe(agent.agentAddress);
    // Base64 signature should be a reasonable length for ed25519 (64 bytes -> ~88 base64 chars)
    expect(sigResult.signature.length).toBeGreaterThan(80);
    expect(sigResult.signatureHex.length).toBe(128); // 64 bytes in hex
  });

  test('6. Different messages produce different signatures', () => {
    const sig1 = agent._signMessage('order1:RELEASE:100');
    const sig2 = agent._signMessage('order2:RELEASE:200');

    expect(sig1.signature).not.toBe(sig2.signature);
    expect(sig1.signatureHex).not.toBe(sig2.signatureHex);
  });

  test('7. _verifySignature can validate a created signature', () => {
    const message = 'test:RELEASE:12345';
    const sigResult = agent._signMessage(message);

    // Should verify with the public key
    const isValid = agent._verifySignature(
      message,
      sigResult.signature,
      agent.keyPair.publicKey
    );
    expect(isValid).toBe(true);

    // Should fail with wrong message
    const isInvalid = agent._verifySignature(
      'wrong-message',
      sigResult.signature,
      agent.keyPair.publicKey
    );
    expect(isInvalid).toBe(false);
  });

  // ────── 3. AI API Integration ──────

  test('8. analyzeWork calls DeepSeek API with correct parameters', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                decision: 'approve',
                confidence: 0.92,
                reasoning: 'Work completed successfully with all deliverables.',
                evidenceChecked: ['delivery_logs', 'completion_api'],
              }),
            },
          },
        ],
      },
    });

    const data = {
      deliveryStatus: 'delivered',
      deliveryProof: 'https://proof.example.com/order123',
      logs: 'All tasks completed at 2025-01-15',
    };

    const result = await agent.analyzeWork('order123', data);

    // Verify API was called correctly
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.deepseek.com/v1/chat/completions',
      expect.objectContaining({
        model: 'deepseek-chat',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        temperature: 0.3,
        max_tokens: 2000,
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-deepseek-key-12345',
        }),
      })
    );

    expect(result.decision).toBe('approve');
    expect(result.confidence).toBe(0.92);
    expect(result.reasoning).toContain('completed');
    expect(result.evidenceChecked).toContain('delivery_logs');
  });

  test('9. analyzeWork returns structured analysis on approve', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                decision: 'approve',
                confidence: 0.88,
                reasoning: 'All deliverables met specifications.',
                evidenceChecked: ['api_check', 'log_review'],
              }),
            },
          },
        ],
      },
    });

    const result = await agent.analyzeWork('order456', {
      deliveryStatus: 'completed',
      apiResponses: { success: true },
    });

    expect(result).toHaveProperty('decision', 'approve');
    expect(result).toHaveProperty('confidence', 0.88);
    expect(result).toHaveProperty('reasoning');
    expect(result).toHaveProperty('evidenceChecked');
    expect(result).toHaveProperty('aiProvider', 'deepseek');
    expect(result).toHaveProperty('model', 'deepseek-chat');
  });

  test('10. analyzeWork handles AI API error gracefully (fallback)', async () => {
    axios.post.mockRejectedValue(new Error('API timeout'));

    const result = await agent.analyzeWork('order789', {
      deliveryStatus: 'delivered',
      deliveryProof: 'proof.pdf',
    });

    // Should fall back to rule-based
    expect(result).toBeDefined();
    expect(result).toHaveProperty('decision');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('reasoning');
    expect(result.aiProvider).toBe('fallback');
  });

  test('11. analyzeWork handles JSON parse edge cases (markdown block)', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: 'Here is my analysis:\n```json\n{\n  "decision": "reject",\n  "confidence": 0.95,\n  "reasoning": "Evidence shows incomplete work.",\n  "evidenceChecked": ["build_logs"]\n}\n```',
            },
          },
        ],
      },
    });

    const result = await agent.analyzeWork('order101', {
      logs: 'BUILD FAILED: missing dependencies',
    });

    expect(result.decision).toBe('reject');
    expect(result.confidence).toBe(0.95);
    expect(result.reasoning).toContain('incomplete');
  });

  // ────── 4. signRelease ──────

  test('12. signRelease creates a valid signed release', async () => {
    const analysis = {
      decision: 'approve',
      confidence: 0.85,
      reasoning: 'Work verified successfully.',
      evidenceChecked: ['proof', 'logs'],
      aiProvider: 'deepseek',
      model: 'deepseek-chat',
    };

    const result = await agent.signRelease('order-sign-1', analysis);

    expect(result.signed).toBe(true);
    expect(result.orderId).toBe('order-sign-1');
    expect(result.signature).toBeDefined();
    expect(result.signatureHex).toBeDefined();
    expect(result.publicKey).toBe(agent.publicKeyHex);
    expect(result.signedMessage).toContain('order-sign-1:RELEASE');
    expect(result.confidence).toBe(0.85);
    expect(result.reasoning).toBe('Work verified successfully.');
  });

  test('13. signRelease logs decision to AIDecisionLog', async () => {
    const analysis = {
      decision: 'approve',
      confidence: 0.9,
      reasoning: 'Good evidence.',
      evidenceChecked: ['delivery_proof'],
      aiProvider: 'deepseek',
      model: 'deepseek-chat',
    };

    await agent.signRelease('order-log-test', analysis);

    expect(AIDecisionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-log-test',
        action: 'sign',
        statusCode: 'approved',
        confidence: 0.9,
        verified: true,
      })
    );
  });

  // ────── 5. rejectRelease ──────

  test('14. rejectRelease creates a proper rejection', async () => {
    const result = await agent.rejectRelease(
      'order-reject-1',
      'Delivery proof is invalid. No evidence of work completion.'
    );

    expect(result.signed).toBe(false);
    expect(result.orderId).toBe('order-reject-1');
    expect(result.reason).toContain('Delivery proof is invalid');
    expect(result.confidence).toBe(1);
  });

  // ────── 6. processWebhook ──────

  test('15. processWebhook approves a good delivery', async () => {
    // Mock AI API to approve
    axios.post.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                decision: 'approve',
                confidence: 0.85,
                reasoning: 'Delivery completed with proof.',
                evidenceChecked: ['delivery_status', 'proof'],
              }),
            },
          },
        ],
      },
    });

    // Clear initial calls from constructor logging
    jest.clearAllMocks();

    const payload = {
      orderId: 'webhook-approve-1',
      status: 'delivered',
      deliveryProof: 'https://proof.example.com/file.pdf',
      logs: 'Deployment completed successfully',
    };

    const result = await agent.processWebhook(payload);

    expect(result.signed).toBe(true);
    expect(result.orderId).toBe('webhook-approve-1');
    expect(result.signature).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('16. processWebhook rejects a bad delivery', async () => {
    axios.post.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                decision: 'reject',
                confidence: 0.95,
                reasoning: 'Build logs show errors.',
                evidenceChecked: ['build_logs'],
              }),
            },
          },
        ],
      },
    });

    jest.clearAllMocks();

    const payload = {
      orderId: 'webhook-reject-1',
      status: 'failed',
      logs: 'ERROR: Build failed at step 3/10',
    };

    const result = await agent.processWebhook(payload);

    expect(result.signed).toBe(false);
    expect(result.orderId).toBe('webhook-reject-1');
    expect(result.reason).toBeDefined();
  });

  test('17. processWebhook throws on missing orderId', async () => {
    await expect(
      agent.processWebhook({ status: 'delivered' })
    ).rejects.toThrow('orderId');
  });

  // ────── 7. Decision History & Status ──────

  test('18. getDecisionHistory returns decisions for an order', async () => {
    const decisions = await agent.getDecisionHistory('order123');

    expect(AIDecisionLog.find).toHaveBeenCalledWith({ orderId: 'order123' });
    expect(decisions).toBeInstanceOf(Array);
    expect(decisions.length).toBeGreaterThanOrEqual(1);
  });

  test('19. getDecisionHistory returns all decisions without orderId', async () => {
    await agent.getDecisionHistory(null, 10);

    expect(AIDecisionLog.find).toHaveBeenCalledWith({});
  });

  test('20. getStatus returns agent info with statistics', async () => {
    const status = await agent.getStatus();

    expect(status).toHaveProperty('agentId', 'test-agent-001');
    expect(status).toHaveProperty('version', '1.0.0');
    expect(status).toHaveProperty('status', 'active');
    expect(status).toHaveProperty('publicKey');
    expect(status).toHaveProperty('agentAddress');
    expect(status).toHaveProperty('aiProvider', 'deepseek');
    expect(status).toHaveProperty('aiConfigured', true);
    expect(status).toHaveProperty('moneroKeyConfigured', true);
    expect(status).toHaveProperty('totals');
    expect(status.totals).toHaveProperty('totalDecisions', 8);
    expect(status.totals).toHaveProperty('signed', 5);
    expect(status.totals).toHaveProperty('rejected', 2);
    expect(status.totals).toHaveProperty('pending', 1);
    expect(status).toHaveProperty('lastDecision');
  });

  // ────── 8. Rule-based fallback ──────

  test('21. Rule-based fallback approves with positive status + proof', async () => {
    // Temporarily remove API key to force fallback
    const originalKey = process.env.AI_AGENT_API_KEY;
    delete process.env.AI_AGENT_API_KEY;
    const fallbackAgent = createAgent();
    process.env.AI_AGENT_API_KEY = originalKey;

    const result = await fallbackAgent.analyzeWork('fallback-1', {
      deliveryStatus: 'delivered',
      deliveryProof: 'proof.pdf',
    });

    expect(result.decision).toBe('approve');
    expect(result.confidence).toBe(0.8);
    expect(result.aiProvider).toBe('fallback');
  });

  test('22. Rule-based fallback rejects with error logs', async () => {
    const originalKey = process.env.AI_AGENT_API_KEY;
    delete process.env.AI_AGENT_API_KEY;
    const fallbackAgent = createAgent();
    process.env.AI_AGENT_API_KEY = originalKey;

    const result = await fallbackAgent.analyzeWork('fallback-2', {
      deliveryStatus: 'failed',
      logs: 'ERROR: Critical failure in deployment',
    });

    expect(result.decision).toBe('reject');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('23. Rule-based fallback handles empty data', async () => {
    const originalKey = process.env.AI_AGENT_API_KEY;
    delete process.env.AI_AGENT_API_KEY;
    const fallbackAgent = createAgent();
    process.env.AI_AGENT_API_KEY = originalKey;

    const result = await fallbackAgent.analyzeWork('fallback-3', {});

    expect(result.decision).toBe('reject');
    expect(result.confidence).toBe(0);
  });
});
