/**
 * Escrow Gateway REST API routes.
 * Coordinates escrow flow between wallet, AI agent, and marketplace.
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const escrowService = require('../../services/escrowGateway');
const logger = require('winston');

// ── POST: Create escrow-enabled order ──────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { orderId, sellerId, amount, currency, releaseCondition } = req.body;
    
    const escrow = await escrowService.createEscrowOrder({
      orderId,
      buyerId: req.user._id,
      sellerId,
      amount,
      currency,
      releaseCondition
    });

    return res.status(201).json({ success: true, data: escrow });
  } catch (err) {
    logger.error('Create escrow error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST: Fund escrow ──────────────────────────────────────────
router.post('/:escrowId/fund', auth, async (req, res) => {
  try {
    const { moneroTxid } = req.body;
    const escrow = await escrowService.fundEscrow(req.params.escrowId, moneroTxid);
    return res.json({ success: true, data: escrow });
  } catch (err) {
    logger.error('Fund escrow error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST: Mark as completed ────────────────────────────────────
router.post('/:escrowId/complete', auth, async (req, res) => {
  try {
    const { deliveryProofUrl, notes } = req.body;
    const escrow = await escrowService.completeEscrow(req.params.escrowId, { deliveryProofUrl, notes });
    return res.json({ success: true, data: escrow });
  } catch (err) {
    logger.error('Complete escrow error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST: Dispute escrow ───────────────────────────────────────
router.post('/:escrowId/dispute', auth, async (req, res) => {
  try {
    const { disputeReason } = req.body;
    const escrow = await escrowService.disputeEscrow(req.params.escrowId, disputeReason);
    return res.json({ success: true, data: escrow });
  } catch (err) {
    logger.error('Dispute escrow error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST: Release funds ────────────────────────────────────────
router.post('/:escrowId/release', auth, async (req, res) => {
  try {
    const { signatures } = req.body;
    const escrow = await escrowService.releaseFunds(req.params.escrowId, signatures);
    return res.json({ success: true, data: escrow });
  } catch (err) {
    logger.error('Release escrow error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST: Refund ───────────────────────────────────────────────
router.post('/:escrowId/refund', auth, async (req, res) => {
  try {
    const { signatures } = req.body;
    const escrow = await escrowService.refundEscrow(req.params.escrowId, signatures);
    return res.json({ success: true, data: escrow });
  } catch (err) {
    logger.error('Refund escrow error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── POST: Escalate ─────────────────────────────────────────────
router.post('/:escrowId/escalate', auth, async (req, res) => {
  try {
    const escrow = await escrowService.escalateEscrow(req.params.escrowId);
    return res.json({ success: true, data: escrow });
  } catch (err) {
    logger.error('Escalate escrow error:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
});

// ── GET: Escrow status ─────────────────────────────────────────
router.get('/:escrowId', auth, async (req, res) => {
  try {
    const status = await escrowService.getEscrowStatus(req.params.escrowId);
    return res.json({ success: true, data: status });
  } catch (err) {
    logger.error('Get escrow status error:', err);
    return res.status(404).json({ success: false, error: err.message });
  }
});

// ── GET: List user escrows ─────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { status, limit, offset } = req.query;
    const escrows = await escrowService.listEscrowsByUser(req.user._id, { status, limit, offset });
    return res.json({ success: true, data: escrows });
  } catch (err) {
    logger.error('List escrows error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
