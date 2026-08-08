const express = require('express');
const router = express.Router();
const escrowService = require('../services/escrowService');

// POST /api/escrow-multistep/create
router.post('/create', (req, res) => {
  try {
    const { buyer, seller, totalAmount, currency, milestones } = req.body;
    if (!buyer || !seller || !totalAmount || !currency || !milestones) {
      return res.status(400).json({ 
        success: false, error: 'buyer, seller, totalAmount, currency, milestones required' 
      });
    }
    const escrow = escrowService.createEscrow(buyer, seller, totalAmount, currency, milestones);
    res.json({ success: true, escrow });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// POST /api/escrow-multistep/deposit
router.post('/deposit', (req, res) => {
  try {
    const { id, amount } = req.body;
    if (!id || !amount) {
      return res.status(400).json({ success: false, error: 'id, amount required' });
    }
    const escrow = escrowService.deposit(id, Number(amount));
    res.json({ success: true, escrow });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// POST /api/escrow-multistep/milestone/approve
router.post('/milestone/approve', (req, res) => {
  try {
    const { id, milestoneStep, approver } = req.body;
    if (!id || !milestoneStep || !approver) {
      return res.status(400).json({ success: false, error: 'id, milestoneStep, approver required' });
    }
    const escrow = escrowService.approveMilestone(id, Number(milestoneStep), approver);
    res.json({ success: true, escrow });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// POST /api/escrow-multistep/milestone/release
router.post('/milestone/release', (req, res) => {
  try {
    const { id, milestoneStep } = req.body;
    if (!id || !milestoneStep) {
      return res.status(400).json({ success: false, error: 'id, milestoneStep required' });
    }
    const escrow = escrowService.releaseMilestone(id, Number(milestoneStep));
    res.json({ success: true, escrow });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// GET /api/escrow-multistep/status/:id
router.get('/status/:id', (req, res) => {
  try {
    const status = escrowService.getStatus(req.params.id);
    res.json({ success: true, ...status });
  } catch (e) {
    res.status(404).json({ success: false, error: e.message });
  }
});

module.exports = router;
