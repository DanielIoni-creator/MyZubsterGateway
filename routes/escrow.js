const express = require('express');
const router = express.Router();
const escrowService = require('../services/escrowDashboardService');

// GET /escrow - List all escrows with filtering
router.get('/', async (req, res) => {
  try {
    const { status, buyer, seller, page = 1, limit = 20 } = req.query;
    const result = await escrowService.listEscrows({ status, buyer, seller, page: parseInt(page), limit: parseInt(limit) });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /escrow/stats - Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await escrowService.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /escrow/report - Generate escrow report
router.get('/report', async (req, res) => {
  try {
    const { from, to, format = 'json' } = req.query;
    const report = await escrowService.generateReport({ from, to, format });
    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /escrow/:id - Escrow detail
router.get('/:id', async (req, res) => {
  try {
    const escrow = await escrowService.getEscrowDetail(req.params.id);
    if (!escrow) return res.status(404).json({ success: false, error: 'Escrow not found' });
    res.json({ success: true, escrow });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /escrow/:id/release - Release escrow funds
router.post('/:id/release', async (req, res) => {
  try {
    const result = await escrowService.releaseEscrow(req.params.id, req.user?.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /escrow/:id/refund - Refund escrow
router.post('/:id/refund', async (req, res) => {
  try {
    const result = await escrowService.refundEscrow(req.params.id, req.user?.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /escrow/:id/dispute - Open dispute
router.post('/:id/dispute', async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await escrowService.openDispute(req.params.id, req.user?.id, reason);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /escrow/:id/timeline - Escrow timeline/events
router.get('/:id/timeline', async (req, res) => {
  try {
    const timeline = await escrowService.getTimeline(req.params.id);
    res.json({ success: true, timeline });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
