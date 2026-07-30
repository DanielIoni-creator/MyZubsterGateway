const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { authorizeAdmin } = require('../../middleware/admin');
const MoneroTransaction = require('../../models/MoneroTransaction');

const isAdmin = [auth, authorizeAdmin];

router.get('/dashboard', (req, res) => {
  res.json({ success: true, data: { stats: {} } });
});

// 1. Add GET /api/admin/transactions with filters (status, date, user, amount).
router.get('/transactions', isAdmin, async (req, res) => {
  try {
    const { status, date, user, amount } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (user) filter.buyerId = user;
    if (amount) filter.amount = Number(amount);
    if (date) {
      const d = new Date(date);
      filter.createdAt = {
        $gte: new Date(d.setHours(0, 0, 0)),
        $lt: new Date(d.setHours(23, 59, 59))
      };
    }
    
    const transactions = await MoneroTransaction.find(filter).populate('buyerId', 'username email');
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Add GET /api/admin/transactions/:id for transaction details.
router.get('/transactions/:id', isAdmin, async (req, res) => {
  try {
    const tx = await MoneroTransaction.findById(req.params.id).populate('buyerId', 'username email');
    if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
    res.json({ success: true, data: tx });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Add POST /api/admin/transactions/:id/verify to manually verify a transaction.
router.post('/transactions/:id/verify', isAdmin, async (req, res) => {
  try {
    const tx = await MoneroTransaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
    
    tx.status = 'confirmed';
    tx.confirmations = req.body.confirmations || tx.confirmations + 1;
    await tx.save();
    
    res.json({ success: true, message: 'Transaction verified manually', data: tx });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Add POST /api/admin/transactions/:id/refund to trigger a refund (if supported).
router.post('/transactions/:id/refund', isAdmin, async (req, res) => {
  try {
    const tx = await MoneroTransaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
    
    if (tx.status !== 'confirmed' && tx.status !== 'failed') {
      // Simulate refund logic
    }
    tx.status = 'failed';
    await tx.save();
    
    res.json({ success: true, message: 'Transaction refund triggered', data: tx });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
