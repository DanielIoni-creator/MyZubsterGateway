const express = require('express');
const router = express.Router();
const Escrow = require('../models/Escrow');
const auth = require('../middleware/auth');
const {
  createEscrowOrder,
  fundEscrow,
  completeEscrow,
  disputeEscrow,
  resolveDispute,
  refundEscrow,
  cancelEscrow,
  getEscrowStats,
} = require('../services/escrowGatewayService');

router.post('/', auth, async (req, res) => {
  try {
    const escrow = await createEscrowOrder({ ...req.body, buyerId: req.user._id });
    res.status(201).json(escrow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await getEscrowStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const escrow = await Escrow.findOne({ orderId: req.params.id });
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }
    res.json(escrow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/fund', auth, async (req, res) => {
  try {
    const escrow = await fundEscrow(req.params.id, req.body.moneroTxid);
    res.json(escrow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/complete', auth, async (req, res) => {
  try {
    const escrow = await completeEscrow(req.params.id);
    res.json(escrow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/dispute', auth, async (req, res) => {
  try {
    const { reason, evidence } = req.body;
    const escrow = await disputeEscrow(req.params.id, req.user._id, reason, evidence);
    res.json(escrow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/resolve', auth, async (req, res) => {
  try {
    const { decision, aiAnalysis } = req.body;
    const escrow = await resolveDispute(req.params.id, decision, req.user._id, aiAnalysis);
    res.json(escrow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/refund', auth, async (req, res) => {
  try {
    const escrow = await refundEscrow(req.params.id, req.body.type || 'manual');
    res.json(escrow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const escrow = await cancelEscrow(req.params.id);
    res.json(escrow);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
