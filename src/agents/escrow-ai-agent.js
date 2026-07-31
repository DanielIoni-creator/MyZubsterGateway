/**
 * Escrow AI Agent — Third Signer in 2/3 Multisig Scheme
 *
 * Responsibilities:
 *  - Receive order status notifications via webhook
 *  - Analyse evidence (logs, external APIs, uploaded files) to verify work completion
 *  - Sign or reject fund release using its key
 *  - Log every decision for full traceability
 */

const axios = require('axios');
const crypto = require('crypto');
const AiAgentDecision = require('../../models/AiAgentDecision');
const Escrow = require('../../models/Escrow');
const logger = require('winston');

// ── Configuration ──────────────────────────────────────────────
const AI_MODEL = process.env.AI_AGENT_MODEL || 'deepseek-chat';
const AI_API_URL = process.env.AI_AGENT_API_URL || 'https://api.deepseek.com/v1/chat/completions';
const AI_API_KEY = process.env.AI_AGENT_API_KEY || '';
const AI_SIGNING_KEY = process.env.AI_AGENT_SIGNING_KEY || crypto.randomBytes(32).toString('hex');
const CONFIDENCE_THRESHOLD = parseFloat(process.env.AI_AGENT_CONFIDENCE_THRESHOLD || '0.7');
const EVIDENCE_TIMEOUT_MS = parseInt(process.env.AI_AGENT_EVIDENCE_TIMEOUT || '30000', 10);

// ── Evidence Verification ─────────────────────────────────────

/**
 * Verify work completion by checking multiple evidence sources.
 * @param {Object} order - The order document from DB
 * @param {Object} webhookPayload - Raw webhook data
 * @returns {Promise<{evidence: Array, summary: string}>}
 */
async function verifyWorkCompletion(order, webhookPayload) {
  const evidence = [];
  const checks = [];

  // 1. Check order status from webhook
  if (webhookPayload.status === 'completed' || webhookPayload.status === 'delivered') {
    evidence.push({
      type: 'log',
      source: 'order_webhook',
      summary: `Order status reported as "${webhookPayload.status}" via webhook notification.`,
      timestamp: new Date()
    });
    checks.push(true);
  } else {
    evidence.push({
      type: 'log',
      source: 'order_webhook',
      summary: `Order status is "${webhookPayload.status || 'unknown'}" — not yet completed.`,
      timestamp: new Date()
    });
    checks.push(false);
  }

  // 2. Check external API for delivery confirmation if URL provided
  if (webhookPayload.deliveryProofUrl) {
    try {
      const resp = await axios.head(webhookPayload.deliveryProofUrl, { timeout: EVIDENCE_TIMEOUT_MS });
      evidence.push({
        type: 'api_check',
        source: webhookPayload.deliveryProofUrl,
        summary: `Delivery proof URL is reachable (HTTP ${resp.status}).`,
        timestamp: new Date()
      });
      checks.push(true);
    } catch (err) {
      evidence.push({
        type: 'api_check',
        source: webhookPayload.deliveryProofUrl,
        summary: `Delivery proof URL unreachable: ${err.message}`,
        timestamp: new Date()
      });
      checks.push(false);
    }
  }

  // 3. Check uploaded files for work proof
  if (webhookPayload.uploadedFiles && Array.isArray(webhookPayload.uploadedFiles)) {
    const validFiles = webhookPayload.uploadedFiles.filter(f => f.url && f.name);
    if (validFiles.length > 0) {
      evidence.push({
        type: 'file_upload',
        source: 'webhook_payload',
        summary: `${validFiles.length} work proof file(s) uploaded: ${validFiles.map(f => f.name).join(', ')}`,
        timestamp: new Date()
      });
      checks.push(validFiles.length >= 1);
    }
  }

  // 4. Check external verification API if configured
  if (process.env.AI_AGENT_EXTERNAL_VERIFY_URL && order._id) {
    try {
      const resp = await axios.post(
        process.env.AI_AGENT_EXTERNAL_VERIFY_URL,
        { orderId: order._id.toString(), userId: order.userId },
        { timeout: EVIDENCE_TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } }
      );
      const verified = resp.data && resp.data.verified === true;
      evidence.push({
        type: 'external_api',
        source: process.env.AI_AGENT_EXTERNAL_VERIFY_URL,
        summary: `External verification API returned verified=${verified}.`,
        timestamp: new Date()
      });
      checks.push(verified);
    } catch (err) {
      evidence.push({
        type: 'external_api',
        source: process.env.AI_AGENT_EXTERNAL_VERIFY_URL,
        summary: `External verification API error: ${err.message}`,
        timestamp: new Date()
      });
      checks.push(false);
    }
  }

  // 5. Check order logs if provided
  if (webhookPayload.logs && Array.isArray(webhookPayload.logs)) {
    const relevantLogs = webhookPayload.logs.filter(
      l => l.event === 'work_completed' || l.event === 'delivery_confirmed'
    );
    if (relevantLogs.length > 0) {
      evidence.push({
        type: 'log',
        source: 'order_logs',
        summary: `${relevantLogs.length} relevant log(s) found: ${relevantLogs.map(l => l.event).join(', ')}`,
        timestamp: new Date()
      });
      checks.push(true);
    }
  }

  const passedChecks = checks.filter(Boolean).length;
  const totalChecks = checks.length;
  const summary = `${passedChecks}/${totalChecks} verification checks passed`;

  return { evidence, summary, passedChecks, totalChecks };
}

// ── AI Analysis ────────────────────────────────────────────────

/**
 * Use AI (DeepSeek/OpenAI) to analyse evidence and produce a decision.
 * Falls back to rule-based decision if AI is not configured.
 * @param {Array} evidence - Evidence array from verifyWorkCompletion
 * @param {Object} order - Order document
 * @returns {Promise<{decision: string, reason: string, confidence: number}>}
 */
async function analyseWithAI(evidence, order) {
  const evidenceText = evidence
    .map((e, i) => `[${i + 1}] (${e.type}) ${e.source}: ${e.summary}`)
    .join('\n');

  // If no AI API key, use rule-based fallback
  if (!AI_API_KEY) {
    const positiveCount = evidence.filter(e =>
      e.summary.includes('reachable') ||
      e.summary.includes('reported as "completed"') ||
      e.summary.includes('reported as "delivered"') ||
      e.summary.includes('verification API returned verified=true')
    ).length;
    const totalCount = evidence.length;
    const confidence = totalCount > 0 ? positiveCount / totalCount : 0;
    const decision = confidence >= CONFIDENCE_THRESHOLD ? 'approve' : 'reject';
    const reason = `Rule-based analysis: ${positiveCount}/${totalCount} positive evidence items. Confidence ${confidence.toFixed(2)} ${decision === 'approve' ? '≥' : '<'} threshold ${CONFIDENCE_THRESHOLD}.`;
    return { decision, reason, confidence };
  }

  // Use AI API for sophisticated analysis
  try {
    const systemPrompt = `You are an AI escrow agent acting as the third signer in a 2/3 multisig scheme.
Your job is to analyse evidence about whether work on an order has been completed satisfactorily.
Respond with a JSON object containing:
- "decision": "approve" or "reject"
- "reason": a concise explanation
- "confidence": a float between 0 and 1`;

    const userPrompt = `Order ID: ${order._id || 'unknown'}
Order status: ${order.status || 'unknown'}

Evidence collected:
${evidenceText}

Analyse this evidence and decide whether to approve or reject fund release.`;

    const resp = await axios.post(
      AI_API_URL,
      {
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' }
      },
      {
        timeout: EVIDENCE_TIMEOUT_MS,
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = resp.data.choices[0].message.content;
    const parsed = JSON.parse(content);
    return {
      decision: parsed.decision === 'approve' ? 'approve' : 'reject',
      reason: parsed.reason || 'No reason provided by AI.',
      confidence: Math.max(0, Math.min(1, parseFloat(parsed.confidence) || 0))
    };
  } catch (err) {
    logger.error('AI analysis failed, falling back to rule-based:', err.message);
    // Fallback to rule-based
    const positiveCount = evidence.filter(e =>
      e.summary.includes('reachable') ||
      e.summary.includes('reported as "completed"') ||
      e.summary.includes('reported as "delivered"') ||
      e.summary.includes('verified=true')
    ).length;
    const confidence = evidence.length > 0 ? positiveCount / evidence.length : 0;
    const decision = confidence >= CONFIDENCE_THRESHOLD ? 'approve' : 'reject';
    return {
      decision,
      reason: `AI analysis failed (${err.message}). Rule-based fallback: ${positiveCount}/${evidence.length} positive evidence.`,
      confidence
    };
  }
}

// ── Signing ────────────────────────────────────────────────────

/**
 * Sign or reject the fund release using the AI agent's key.
 * @param {string} decision - 'approve' or 'reject'
 * @param {Object} order - Order document
 * @returns {{signatureHash: string, signedAt: Date}}
 */
function signDecision(decision, order) {
  const payload = `${decision}:${order._id}:${order.userId}:${Date.now()}`;
  const signatureHash = crypto
    .createHmac('sha256', AI_SIGNING_KEY)
    .update(payload)
    .digest('hex');
  return { signatureHash, signedAt: new Date() };
}

// ── Main Process Function ──────────────────────────────────────

/**
 * Process an order status notification and make a sign/reject decision.
 * This is the entry point called by the webhook handler.
 * @param {Object} order - Order document from MongoDB
 * @param {Object} webhookPayload - Raw webhook data
 * @returns {Promise<Object>} Decision record
 */
async function processEscrowDecision(order, webhookPayload) {
  logger.info(`AI Agent: Processing order ${order._id}, status=${webhookPayload.status}`);

  // Step 1: Gather and verify evidence
  const { evidence, summary } = await verifyWorkCompletion(order, webhookPayload);

  // Step 2: Analyse evidence with AI
  const { decision, reason, confidence } = await analyseWithAI(evidence, order);

  // Step 3: Sign the decision
  const { signatureHash, signedAt } = signDecision(decision, order);

  // Step 4: Persist the decision record
  const decisionRecord = new AiAgentDecision({
    orderId: order._id,
    escrowId: order.escrowId || null,
    decision,
    reason,
    confidenceScore: confidence,
    evidence,
    webhookData: webhookPayload,
    aiModel: AI_MODEL,
    signedAt,
    signatureHash,
    status: decision === 'approve' ? 'signed' : 'rejected'
  });

  await decisionRecord.save();

  // Step 5: Update escrow status if linked
  if (order.escrowId) {
    try {
      const escrow = await Escrow.findById(order.escrowId);
      if (escrow) {
        escrow.aiAgentDecision = decision;
        escrow.aiAgentSignature = signatureHash;
        escrow.aiAgentSignedAt = signedAt;
        escrow.aiAgentConfidence = confidence;
        await escrow.save();
        logger.info(`AI Agent: Updated escrow ${escrow._id} with decision=${decision}`);
      }
    } catch (err) {
      logger.error(`AI Agent: Failed to update escrow: ${err.message}`);
    }
  }

  logger.info(`AI Agent: Decision for order ${order._id}: ${decision} (confidence=${confidence.toFixed(2)})`);

  return {
    decisionId: decisionRecord._id,
    decision,
    reason,
    confidence,
    signatureHash,
    evidence: summary
  };
}

module.exports = {
  processEscrowDecision,
  verifyWorkCompletion,
  analyseWithAI,
  signDecision,
  AI_MODEL,
  CONFIDENCE_THRESHOLD
};
