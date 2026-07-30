const express = require('express');
const router = express.Router();
const AiMultisigAgent = require('../services/aiMultisigAgent');

// Singleton instance of the AI agent
let agentInstance = null;

function getAgent() {
  if (!agentInstance) {
    agentInstance = new AiMultisigAgent();
  }
  return agentInstance;
}

/**
 * POST /api/ai/decide
 * Manually trigger an AI decision for an order.
 * Body: { orderId, data: { logs?, apiResponses?, files?, deliveryStatus?, deliveryProof? } }
 */
router.post('/decide', async (req, res) => {
  try {
    const { orderId, data } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderId is required',
      });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'data object is required with evidence for analysis',
      });
    }

    const agent = getAgent();
    const analysis = await agent.analyzeWork(orderId, data);

    let result;
    if (analysis.decision === 'approve' && analysis.confidence >= agent.config.confidenceThreshold) {
      result = await agent.signRelease(orderId, analysis);
    } else {
      const reason =
        analysis.decision === 'reject'
          ? analysis.reasoning
          : `Confidence too low (${analysis.confidence} < ${agent.config.confidenceThreshold})`;
      result = await agent.rejectRelease(orderId, reason, analysis);
    }

    res.json({
      success: true,
      data: {
        decision: result.signed ? 'approved' : 'rejected',
        ...result,
        analysis,
      },
    });
  } catch (error) {
    console.error('❌ AI decide error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/webhook
 * Webhook endpoint for delivery notifications.
 * The AI agent automatically analyzes the evidence and decides.
 */
router.post('/webhook', async (req, res) => {
  try {
    const agent = getAgent();
    const result = await agent.processWebhook(req.body);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ AI webhook error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/decisions
 * View AI decision history.
 * Query: ?orderId=xxx&limit=20
 */
router.get('/decisions', async (req, res) => {
  try {
    const { orderId, limit } = req.query;
    const agent = getAgent();
    const decisions = await agent.getDecisionHistory(orderId || null, limit);

    res.json({
      success: true,
      count: decisions.length,
      data: decisions,
    });
  } catch (error) {
    console.error('❌ AI decisions error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/ai/status
 * Get AI agent status and statistics.
 */
router.get('/status', async (req, res) => {
  try {
    const agent = getAgent();
    const status = await agent.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('❌ AI status error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/reject
 * Manually reject a release for an order.
 * Body: { orderId, reason }
 */
router.post('/reject', async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'orderId is required',
      });
    }

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'reason is required',
      });
    }

    const agent = getAgent();
    const result = await agent.rejectRelease(orderId, reason);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('❌ AI reject error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
