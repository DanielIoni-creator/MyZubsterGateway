const express = require('express');
const router = express.Router();
const escrowRobot = require('../escrow_robot');

// POST /api/robot/escrow/create
router.post('/create', async (req, res) => {
  try {
    const { jobId, clientId, robotId, amount, currency } = req.body;
    if (!jobId || !clientId || !robotId || !amount || !currency) {
      return res.status(400).json({ error: 'Missing required fields: jobId, clientId, robotId, amount, currency' });
    }
    if (!['MYZ', 'XMR'].includes(currency)) {
      return res.status(400).json({ error: 'Currency must be MYZ or XMR' });
    }
    const escrow = await escrowRobot.createEscrow({ jobId, clientId, robotId, amount, currency });
    res.json({ success: true, data: escrow });
  } catch (err) {
    console.error('❌ Error creating robot escrow:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/robot/escrow/deliver
router.post('/deliver', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
    const result = await escrowRobot.markDelivered({ jobId });
    res.json({ success: true, message: 'Job marked as delivered', data: result });
  } catch (err) {
    console.error('❌ Error marking delivery:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/robot/escrow/dispute
router.post('/dispute', async (req, res) => {
  try {
    const { jobId, reason } = req.body;
    if (!jobId || !reason) return res.status(400).json({ error: 'Missing jobId or reason' });
    const result = await escrowRobot.openDispute({ jobId, reason });
    res.json({ success: true, message: 'Dispute opened', data: result });
  } catch (err) {
    console.error('❌ Error opening dispute:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/robot/escrow/list
router.get('/list', (req, res) => {
  try {
    const escrows = escrowRobot.listEscrows();
    res.json({ success: true, data: escrows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/robot/escrow/:jobId
router.get('/:jobId', (req, res) => {
  try {
    const escrow = escrowRobot.getEscrow(req.params.jobId);
    if (!escrow) return res.status(404).json({ error: 'Escrow not found' });
    res.json({ success: true, data: escrow });
  } catch (err) {
    console.error('❌ Error getting escrow:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
