const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const Transaction = require('../models/Transaction');

/**
 * Admin API for transaction monitoring and management
 * 
 * Endpoints:
 * - GET    /api/admin/transactions           List all transactions with filters
 * - GET    /api/admin/transactions/:id       Get transaction details
 * - POST   /api/admin/transactions/:id/verify Manually verify a transaction
 * - POST   /api/admin/transactions/:id/refund  Trigger a refund
 */

router.use(authenticate);
router.use(authorize('admin'));

/**
 * GET /api/admin/transactions
 * List all transactions with optional filters
 */
router.get('/transactions', async (req, res) => {
  try {
    const { status, date_from, date_to, user_id, amount_min, amount_max, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (date_from || date_to) {
      filter.createdAt = {};
      if (date_from) filter.createdAt.$gte = new Date(date_from);
      if (date_to) filter.createdAt.$lte = new Date(date_to);
    }
    if (user_id) filter.userId = user_id;
    if (amount_min || amount_max) {
      filter.amount = {};
      if (amount_min) filter.amount.$gte = parseFloat(amount_min);
      if (amount_max) filter.amount.$lte = parseFloat(amount_max);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).populate('userId', 'email username').lean(),
      Transaction.countDocuments(filter),
    ]);
    res.json({ success: true, data: { transactions, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

/**
 * GET /api/admin/transactions/:id
 */
router.get('/transactions/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate('userId', 'email username').populate('orderId').lean();
    if (!transaction) return res.status(404).json({ success: false, error: 'Transaction not found' });
    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
  }
});

/**
 * POST /api/admin/transactions/:id/verify
 */
router.post('/transactions/:id/verify', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, error: 'Transaction not found' });
    if (transaction.status === 'verified') return res.status(400).json({ success: false, error: 'Transaction already verified' });
    transaction.status = 'verified';
    transaction.verifiedBy = req.user._id;
    transaction.verifiedAt = new Date();
    await transaction.save();
    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to verify transaction' });
  }
});

/**
 * POST /api/admin/transactions/:id/refund
 */
router.post('/transactions/:id/refund', async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, error: 'Transaction not found' });
    if (transaction.status === 'refunded') return res.status(400).json({ success: false, error: 'Transaction already refunded' });
    transaction.status = 'refunding';
    transaction.refundRequestedBy = req.user._id;
    transaction.refundRequestedAt = new Date();
    transaction.refundReason = req.body.reason || 'Admin initiated refund';
    await transaction.save();
    res.json({ success: true, data: transaction, message: 'Refund initiated.' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to process refund' });
  }
});

module.exports = router;
