/**
 * Escrow AI Agent routes — webhook receiver for order status notifications.
 * The AI agent receives notifications, verifies work completion, and signs/rejects.
 */

const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');
const { processEscrowDecision } = require('../agents/escrow-ai-agent');
const auth = require('../../middleware/auth');
const logger = require('winston');

// ── Webhook: Order Status Notification ─────────────────────────
// This endpoint receives order status updates from the marketplace.
// It triggers the AI agent's verification and signing process.
// Auth: JWT required (marketplace service token) or webhook secret.
router.post('/webhook/order-status', auth, async (req, res) => {
  try {
    const { orderId, status, deliveryProofUrl, uploadedFiles, logs } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: req.t('errors.missingOrderId', { defaultValue: 'orderId is required' })
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: req.t('errors.orderNotFound', { defaultValue: 'Order not found' })
      });
    }

    // Process through AI agent
    const result = await processEscrowDecision(order, {
      status,
      deliveryProofUrl,
      uploadedFiles,
      logs
    });

    logger.info(`Escrow AI webhook processed for order ${orderId}: ${result.decision}`);

    return res.json({
      success: true,
      data: {
        decisionId: result.decisionId,
        decision: result.decision,
        confidence: result.confidence,
        reason: result.reason,
        evidence: result.evidence,
        signatureHash: result.signatureHash
      }
    });
  } catch (err) {
    logger.error('Escrow AI webhook error:', err);
    return res.status(500).json({
      success: false,
      error: req.t('errors.internalError', { defaultValue: 'Internal server error' })
    });
  }
});

// ── GET: Retrieve AI decision history for an order ─────────────
router.get('/decisions/:orderId', auth, async (req, res) => {
  try {
    const AiAgentDecision = require('../../models/AiAgentDecision');
    const decisions = await AiAgentDecision
      .find({ orderId: req.params.orderId })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      success: true,
      data: decisions
    });
  } catch (err) {
    logger.error('Error fetching AI decisions:', err);
    return res.status(500).json({
      success: false,
      error: req.t('errors.internalError', { defaultValue: 'Internal server error' })
    });
  }
});

// ── GET: Retrieve a single decision by ID ──────────────────────
router.get('/decisions/:decisionId/detail', auth, async (req, res) => {
  try {
    const AiAgentDecision = require('../../models/AiAgentDecision');
    const decision = await AiAgentDecision.findById(req.params.decisionId);
    if (!decision) {
      return res.status(404).json({
        success: false,
        error: req.t('errors.decisionNotFound', { defaultValue: 'Decision not found' })
      });
    }
    return res.json({
      success: true,
      data: decision
    });
  } catch (err) {
    logger.error('Error fetching decision:', err);
    return res.status(500).json({
      success: false,
      error: req.t('errors.internalError', { defaultValue: 'Internal server error' })
    });
  }
});

// ── POST: Manual override — force a decision (admin only) ──────
router.post('/manual-override/:orderId', auth, async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: req.t('errors.adminOnly', { defaultValue: 'Admin access required' })
      });
    }

    const { decision, reason } = req.body;
    if (!decision || !['approve', 'reject'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'decision must be "approve" or "reject"'
      });
    }

    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const { signDecision } = require('../agents/escrow-ai-agent');
    const { signatureHash, signedAt } = signDecision(decision, order);

    const AiAgentDecision = require('../../models/AiAgentDecision');
    const record = new AiAgentDecision({
      orderId: order._id,
      escrowId: order.escrowId || null,
      decision,
      reason: reason || 'Manual override by admin',
      confidenceScore: 1.0,
      evidence: [{
        type: 'manual_review',
        source: 'admin_override',
        summary: `Admin ${req.user.id} manually set decision to ${decision}`,
        timestamp: new Date()
      }],
      aiModel: 'manual-override',
      signedAt,
      signatureHash,
      status: decision === 'approve' ? 'signed' : 'rejected'
    });

    await record.save();

    return res.json({
      success: true,
      data: record
    });
  } catch (err) {
    logger.error('Manual override error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
