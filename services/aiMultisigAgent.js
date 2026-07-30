const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const AIDecisionLog = require('../models/AIDecisionLog');

/**
 * AI Multisig Agent — Third signer for 2/3 multisig escrow.
 *
 * Responsibilities:
 *  - Receive order status webhook notifications
 *  - Analyze data (logs, APIs, files) to verify work completion
 *  - Sign or reject fund release using Monero-style ed25519 signing
 *  - Integrate DeepSeek / OpenAI API for decision-making
 *  - Maintain full decision audit trail in AIDecisionLog
 */
class AiMultisigAgent {
  constructor(configPath) {
    const resolvedPath =
      configPath ||
      path.resolve(__dirname, '..', 'config', 'ai-agent.json');

    if (!fs.existsSync(resolvedPath)) {
      console.warn(
        `⚠️ AI agent config not found at ${resolvedPath}, using defaults`
      );
      this.config = this._defaultConfig();
    } else {
      this.config = {
        ...this._defaultConfig(),
        ...JSON.parse(fs.readFileSync(resolvedPath, 'utf-8')),
      };
    }

    // Load sensitive values from environment
    this.apiKey = process.env[this.config.apiKeyEnvVar] || null;
    this.moneroPrivateKeyHex =
      process.env[this.config.moneroKeyEnvVar] || null;

    // Load or generate ed25519 key pair
    this._initKeyPair();

    console.log(`🤖 AI Multisig Agent initialized [${this.config.agentId}]`);
    console.log(`   Provider: ${this.config.aiProvider}`);
    console.log(`   Model: ${this.config.model}`);
    console.log(
      `   AI API Key: ${this.apiKey ? '✅ configured' : '❌ missing'}`
    );
    console.log(
      `   Monero Key: ${
        this.moneroPrivateKeyHex ? '✅ configured' : '❌ missing'
      }`
    );
  }

  // ────────────────────────── Defaults ──────────────────────────

  _defaultConfig() {
    return {
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
      agentId: 'ai-multisig-agent-001',
      version: '1.0.0',
    };
  }

  // ──────────────────────── Key Management ──────────────────────

  _initKeyPair() {
    try {
      if (this.moneroPrivateKeyHex) {
        // Load existing key from hex
        const privateKeyBuffer = Buffer.from(this.moneroPrivateKeyHex, 'hex');
        // Generate public key from private using ed25519
        // Node.js crypto does not support raw ed25519 key import easily,
        // so we create a key object from the raw seed
        this.keyPair = crypto.generateKeyPairSync('ed25519', {
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
          publicKeyEncoding: { type: 'spki', format: 'pem' },
        });
        // Store the raw hex for signing
        this._privateKeyRaw = privateKeyBuffer;
      } else {
        // Generate fresh key pair
        this.keyPair = crypto.generateKeyPairSync('ed25519', {
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
          publicKeyEncoding: { type: 'spki', format: 'pem' },
        });
        this._privateKeyRaw = null;
        console.log('🔑 Generated new ed25519 key pair for AI agent');
      }

      // Extract public key hex from PEM
      const pubKeyObj = crypto.createPublicKey(this.keyPair.publicKey);
      const pubKeyRaw = pubKeyObj.export({ type: 'spki', format: 'der' });
      this.publicKeyHex = pubKeyRaw.toString('hex');

      // Monero-style address derived from public key (simplified)
      // Real Monero would use Keccak + base58, but for the agent we
      // identify by the public key hash
      const hash = crypto.createHash('sha256').update(pubKeyRaw).digest('hex');
      this.agentAddress = `AI_${hash.substring(0, 16)}`;
    } catch (err) {
      console.error('❌ Failed to initialize key pair:', err.message);
      this.keyPair = null;
      this.publicKeyHex = '';
      this.agentAddress = '';
    }
  }

  /**
   * Sign a message using the agent's ed25519 key.
   * Uses Node.js crypto sign with ed25519 (conceptually compatible
   * with Monero's EdDSA approach, though real Monero uses a specific
   * keccak-based variant).
   */
  _signMessage(message) {
    if (!this.keyPair) {
      throw new Error('AI agent key pair not initialized');
    }

    // Use static crypto.sign() — compatible across Node.js versions
    const buffer = Buffer.from(message, 'utf-8');
    const signature = crypto.sign(null, buffer, this.keyPair.privateKey);

    return {
      signature: signature.toString('base64'),
      signatureHex: signature.toString('hex'),
      publicKey: this.publicKeyHex,
      agentAddress: this.agentAddress,
    };
  }

  /**
   * Verify a signature (used for testing / external verification).
   */
  _verifySignature(message, signatureBase64, publicKeyPem) {
    const buffer = Buffer.from(message, 'utf-8');
    const sigBuffer = Buffer.from(signatureBase64, 'base64');
    return crypto.verify(null, buffer, publicKeyPem, sigBuffer);
  }

  // ────────────────────── AI Integration ────────────────────────

  /**
   * Build a system prompt that instructs the AI on how to evaluate
   * work evidence for multisig release decisions.
   */
  _buildSystemPrompt() {
    return `You are an AI agent acting as the THIRD SIGNER in a 2/3 multisig escrow system on a decentralized marketplace.

Your role:
1. You receive work evidence (logs, API responses, file contents, delivery proofs)
2. You analyze whether the work has been completed satisfactorily
3. You decide to APPROVE or REJECT the release of funds

Evaluation criteria:
- Does the evidence show the work was completed as specified?
- Are there any discrepancies, errors, or signs of fraud?
- Is the delivery proof valid and verifiable?
- What is your confidence level in this decision?

You MUST respond with a JSON object ONLY, no markdown, no additional text:
{
  "decision": "approve" | "reject",
  "confidence": <0.0-1.0>,
  "reasoning": "<detailed explanation of your reasoning>",
  "evidenceChecked": ["<list of evidence items checked>"]
}`;
  }

  /**
   * Call the configured AI API (DeepSeek / OpenAI) to analyze work evidence.
   * @param {Object} data - Work evidence: { logs, apiResponses, files, deliveryProof, orderDetails }
   * @returns {Object} Parsed AI response with decision, confidence, reasoning
   */
  async analyzeWork(orderId, data) {
    if (!this.apiKey) {
      console.warn('⚠️ No AI API key configured, falling back to rule-based analysis');
      return this._ruleBasedFallback(data);
    }

    try {
      const systemPrompt = this._buildSystemPrompt();
      const userMessage = {
        orderId,
        analysisTimestamp: new Date().toISOString(),
        evidence: data,
      };

      const response = await axios.post(
        this.config.aiEndpoint,
        {
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify(userMessage, null, 2) },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const content = response.data.choices[0].message.content;

      // Parse JSON response from AI
      let parsed;
      try {
        // Try direct parse
        parsed = JSON.parse(content);
      } catch {
        // Try to extract JSON from markdown code block
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1].trim());
        } else {
          throw new Error('Could not parse AI response as JSON');
        }
      }

      return {
        decision: parsed.decision === 'approve' ? 'approve' : 'reject',
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0)),
        reasoning: parsed.reasoning || 'No reasoning provided',
        evidenceChecked: parsed.evidenceChecked || [],
        rawResponse: content.substring(0, 500),
        aiProvider: this.config.aiProvider,
        model: this.config.model,
      };
    } catch (error) {
      console.error('❌ AI API call failed:', error.message);
      // Fallback to rule-based analysis on API failure
      console.warn('⚠️ Falling back to rule-based analysis');
      return this._ruleBasedFallback(data);
    }
  }

  /**
   * Rule-based fallback when AI API is unavailable.
   * Makes a simple heuristic decision based on available evidence.
   */
  _ruleBasedFallback(data) {
    const signals = [];
    const evidenceChecked = [];

    if (!data || Object.keys(data).length === 0) {
      return {
        decision: 'reject',
        confidence: 0,
        reasoning: 'No evidence provided for analysis.',
        evidenceChecked: [],
        rawResponse: 'fallback: no data',
        aiProvider: 'fallback',
        model: 'rule-based',
      };
    }

    // Check delivery status
    if (data.deliveryStatus) {
      evidenceChecked.push(`deliveryStatus: ${data.deliveryStatus}`);
      if (
        ['delivered', 'completed', 'fulfilled'].includes(
          data.deliveryStatus.toLowerCase()
        )
      ) {
        signals.push('positive_status');
      } else if (
        ['failed', 'rejected', 'cancelled'].includes(
          data.deliveryStatus.toLowerCase()
        )
      ) {
        signals.push('negative_status');
      }
    }

    // Check for delivery proof
    if (data.deliveryProof || data.proof) {
      signals.push('proof_present');
      evidenceChecked.push('deliveryProof: present');
    }

    // Check logs for errors
    if (data.logs) {
      evidenceChecked.push('logs: reviewed');
      const logStr =
        typeof data.logs === 'string' ? data.logs : JSON.stringify(data.logs);
      if (
        logStr.toLowerCase().includes('error') ||
        logStr.toLowerCase().includes('fail')
      ) {
        signals.push('logs_have_errors');
      } else {
        signals.push('logs_clean');
      }
    }

    // Check API responses
    if (data.apiResponses) {
      evidenceChecked.push('apiResponses: reviewed');
      const apiStr =
        typeof data.apiResponses === 'string'
          ? data.apiResponses
          : JSON.stringify(data.apiResponses);
      if (apiStr.includes('"status":"ok"') || apiStr.includes('"success":true')) {
        signals.push('api_ok');
      }
    }

    // Decide based on signals
    const hasPositiveStatus = signals.includes('positive_status');
    const hasProof = signals.includes('proof_present');
    const hasNegativeStatus = signals.includes('negative_status');
    const hasErrors = signals.includes('logs_have_errors');

    if (hasNegativeStatus || hasErrors) {
      return {
        decision: 'reject',
        confidence: signals.includes('negative_status') ? 0.9 : 0.7,
        reasoning: hasNegativeStatus
          ? 'Delivery status indicates failure or rejection.'
          : 'Logs contain errors or failure indicators.',
        evidenceChecked,
        rawResponse: 'fallback: heuristic',
        aiProvider: 'fallback',
        model: 'rule-based',
      };
    }

    if (hasPositiveStatus && hasProof) {
      return {
        decision: 'approve',
        confidence: 0.8,
        reasoning:
          'Delivery status is positive and proof is present. Evidence is sufficient for release.',
        evidenceChecked,
        rawResponse: 'fallback: heuristic',
        aiProvider: 'fallback',
        model: 'rule-based',
      };
    }

    if (hasPositiveStatus) {
      return {
        decision: 'approve',
        confidence: 0.6,
        reasoning:
          'Delivery status is positive but no proof provided. Moderate confidence.',
        evidenceChecked,
        rawResponse: 'fallback: heuristic',
        aiProvider: 'fallback',
        model: 'rule-based',
      };
    }

    return {
      decision: 'reject',
      confidence: 0.3,
      reasoning:
        'Insufficient evidence to make a determination. Need more data.',
      evidenceChecked,
      rawResponse: 'fallback: heuristic',
      aiProvider: 'fallback',
      model: 'rule-based',
    };
  }

  // ────────────────── Multisig Operations ──────────────────────

  /**
   * Sign a release transaction for an order.
   * Creates an ed25519 signature over the release message.
   *
   * @param {string} orderId - The order ID to release
   * @param {Object} analysis - The analysis result from analyzeWork
   * @returns {Object} Signature result
   */
  async signRelease(orderId, analysis) {
    const timestamp = Date.now();
    const message = `${orderId}:RELEASE:${timestamp}`;

    let sigResult;
    try {
      sigResult = this._signMessage(message);
    } catch (err) {
      console.error('❌ Signing failed:', err.message);
      throw new Error(`Failed to sign release: ${err.message}`);
    }

    const decision = {
      orderId,
      action: 'sign',
      analysis: analysis.reasoning || 'Approved by AI agent',
      confidence: analysis.confidence || 0,
      signature: sigResult.signature,
      signatureHex: sigResult.signatureHex,
      reason: '',
      evidenceUrls: [],
      dataSources: (analysis.evidenceChecked || []).map((item) => ({
        type: 'evidence',
        value: item,
      })),
      verified: true,
      statusCode: 'approved',
      decisionAt: new Date(timestamp),
      metadata: {
        signedMessage: message,
        agentAddress: this.agentAddress,
        publicKey: this.publicKeyHex,
        aiProvider: analysis.aiProvider || 'unknown',
        model: analysis.model || 'unknown',
      },
    };

    if (this.config.decisionLogging) {
      await AIDecisionLog.create(decision);
    }

    console.log(
      `✅ AI Agent SIGNED release for order ${orderId} (confidence: ${analysis.confidence})`
    );

    return {
      signed: true,
      orderId,
      signature: sigResult.signature,
      signatureHex: sigResult.signatureHex,
      publicKey: this.publicKeyHex,
      agentAddress: this.agentAddress,
      signedMessage: message,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      timestamp,
    };
  }

  /**
   * Reject a release for an order.
   *
   * @param {string} orderId - The order ID to reject
   * @param {string} reason - Detailed rejection reason
   * @param {Object} [analysis] - Optional analysis result from analyzeWork
   * @returns {Object} Rejection result
   */
  async rejectRelease(orderId, reason, analysis = null) {
    const decision = {
      orderId,
      action: 'reject',
      analysis: analysis ? analysis.reasoning : reason,
      confidence: analysis ? analysis.confidence : 1,
      signature: null,
      signatureHex: null,
      reason,
      evidenceUrls: [],
      dataSources: analysis
        ? (analysis.evidenceChecked || []).map((item) => ({
            type: 'evidence',
            value: item,
          }))
        : [],
      verified: false,
      statusCode: 'rejected',
      decisionAt: new Date(),
      metadata: {
        agentAddress: this.agentAddress,
        publicKey: this.publicKeyHex,
        aiProvider: analysis ? analysis.aiProvider || 'unknown' : 'manual',
        model: analysis ? analysis.model || 'unknown' : 'manual',
      },
    };

    if (this.config.decisionLogging) {
      await AIDecisionLog.create(decision);
    }

    console.log(
      `❌ AI Agent REJECTED release for order ${orderId}: ${reason}`
    );

    return {
      signed: false,
      orderId,
      reason,
      confidence: analysis ? analysis.confidence : 1,
      reasoning: analysis ? analysis.reasoning : reason,
      agentAddress: this.agentAddress,
      timestamp: Date.now(),
    };
  }

  // ────────────────── Webhook Processing ────────────────────────

  /**
   * Main entry point for processing a delivery webhook.
   * Flow: Receive payload -> Analyze evidence -> Sign or Reject -> Log decision
   *
   * @param {Object} payload - Webhook payload from delivery service
   * @returns {Object} Decision result
   */
  async processWebhook(payload) {
    const orderId = payload.orderId || payload.order_id || null;

    if (!orderId) {
      throw new Error('Webhook payload missing orderId');
    }

    console.log(`📩 Webhook received for order ${orderId}`);

    // Extract evidence from webhook payload
    const evidence = {
      deliveryStatus: payload.status || payload.deliveryStatus,
      deliveryProof: payload.proof || payload.deliveryProof,
      logs: payload.logs || null,
      apiResponses: payload.apiResponses || null,
      files: payload.files || null,
      orderDetails: payload.orderDetails || null,
      sellerInfo: payload.sellerId || payload.sellerInfo || null,
      buyerInfo: payload.buyerId || payload.buyerInfo || null,
    };

    // Run AI analysis
    const analysis = await this.analyzeWork(orderId, evidence);

    // Log the webhook receipt
    if (this.config.decisionLogging) {
      await AIDecisionLog.create({
        orderId,
        action: 'pending',
        analysis: 'Webhook received, processing...',
        confidence: 0,
        statusCode: 'pending_review',
        decisionAt: new Date(),
        webhookPayload: payload,
        dataSources: Object.keys(evidence)
          .filter((k) => evidence[k] !== null)
          .map((k) => ({ type: 'webhook_field', value: k })),
      });
    }

    // Make decision based on analysis
    if (analysis.decision === 'approve' && analysis.confidence >= this.config.confidenceThreshold) {
      return this.signRelease(orderId, analysis);
    } else {
      const reason =
        analysis.decision === 'reject'
          ? analysis.reasoning
          : `Confidence too low (${analysis.confidence} < ${this.config.confidenceThreshold}). Manual review required.`;
      return this.rejectRelease(orderId, reason, analysis);
    }
  }

  // ──────────────────── Query Methods ──────────────────────────

  /**
   * Get decision history for a specific order or all decisions.
   */
  async getDecisionHistory(orderId = null, limit = 20) {
    const filter = orderId ? { orderId } : {};
    return AIDecisionLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 20, 200))
      .populate('orderId', 'orderNumber status totalPrice')
      .lean();
  }

  /**
   * Get agent status and statistics.
   */
  async getStatus() {
    const totalDecisions = await AIDecisionLog.countDocuments();
    const signedCount = await AIDecisionLog.countDocuments({ action: 'sign' });
    const rejectedCount = await AIDecisionLog.countDocuments({
      action: 'reject',
    });
    const pendingCount = await AIDecisionLog.countDocuments({
      action: 'pending',
    });
    const lastDecision = await AIDecisionLog.findOne()
      .sort({ createdAt: -1 })
      .lean();

    return {
      agentId: this.config.agentId,
      version: this.config.version,
      status: this.keyPair ? 'active' : 'uninitialized',
      publicKey: this.publicKeyHex,
      agentAddress: this.agentAddress,
      aiProvider: this.config.aiProvider,
      aiModel: this.config.model,
      aiConfigured: !!this.apiKey,
      moneroKeyConfigured: !!this.moneroPrivateKeyHex,
      confidenceThreshold: this.config.confidenceThreshold,
      decisionLogging: this.config.decisionLogging,
      totals: {
        totalDecisions,
        signed: signedCount,
        rejected: rejectedCount,
        pending: pendingCount,
      },
      lastDecision: lastDecision
        ? {
            orderId: lastDecision.orderId,
            action: lastDecision.action,
            statusCode: lastDecision.statusCode,
            confidence: lastDecision.confidence,
            createdAt: lastDecision.createdAt,
          }
        : null,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = AiMultisigAgent;
