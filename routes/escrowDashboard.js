const express = require('express');
const router = express.Router();

const escrowList = [
  { id: 'esc_101', title: 'Fauna Biodiversity Monitoring', amount: 700, currency: 'MYZ', status: 'CLAIMED', createdAt: '2026-08-08T06:57:31Z' },
  { id: 'esc_102', title: 'Urban Garden Mapping', amount: 500, currency: 'MYZ', status: 'ACTIVE', createdAt: '2026-08-08T07:15:00Z' },
];

// GET /api/escrow-dashboard/list - Escrow list management
router.get('/list', (req, res) => {
  const { status } = req.query;

  if (status) {
    const filtered = escrowList.filter((e) => e.status.toUpperCase() === status.toUpperCase());
    return res.json({ count: filtered.length, escrows: filtered });
  }

  res.json({ count: escrowList.length, escrows: escrowList });
});

// GET /api/escrow-dashboard/:id - Escrow detail query
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const escrow = escrowList.find((e) => e.id === id);

  if (!escrow) {
    return res.status(404).json({ error: 'Escrow contract not found' });
  }

  res.json({ escrow });
});

// POST /api/escrow-dashboard/:id/action - Escrow lifecycle actions
router.post('/:id/action', (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  const escrow = escrowList.find((e) => e.id === id);
  if (!escrow) {
    return res.status(404).json({ error: 'Escrow contract not found' });
  }

  if (!action || !['RELEASE', 'REFUND', 'DISPUTE'].includes(action.toUpperCase())) {
    return res.status(400).json({ error: 'action must be RELEASE, REFUND, or DISPUTE' });
  }

  escrow.status = action.toUpperCase() === 'RELEASE' ? 'RELEASED' : action.toUpperCase() === 'REFUND' ? 'REFUNDED' : 'IN_DISPUTE';
  res.json({ success: true, action: action.toUpperCase(), escrow });
});

// GET /api/escrow-dashboard/report/summary - Escrow management report
router.get('/report/summary', (req, res) => {
  const activeCount = escrowList.filter((e) => e.status === 'ACTIVE').length;
  const releasedCount = escrowList.filter((e) => e.status === 'RELEASED' || e.status === 'CLAIMED').length;
  const totalVolumeMYZ = escrowList.reduce((sum, e) => sum + e.amount, 0);

  res.json({
    report: {
      totalEscrows: escrowList.length,
      activeCount,
      releasedCount,
      totalVolumeMYZ,
      generatedAt: new Date().toISOString(),
    },
  });
});

module.exports = router;
