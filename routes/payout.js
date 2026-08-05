// routes/payout.js — Payout/Withdraw API for MYZ → Tari wallet
const express = require('express');
const router = express.Router();
const Reward = require('../models/Reward');
const tariPayout = require('../gateway/tari_payout');

// GET /api/payout/balance — Get available balance for withdrawal
router.get('/balance', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Sum all completed rewards
    const completed = await Reward.aggregate([
      { $match: { userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Sum all already withdrawn
    const withdrawn = await Reward.aggregate([
      { $match: { userId, status: 'withdrawn' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalEarned = completed[0]?.total || 0;
    const totalWithdrawn = withdrawn[0]?.total || 0;
    const available = totalEarned - totalWithdrawn;

    res.json({
      success: true,
      balance: {
        totalEarned,
        totalWithdrawn,
        available,
        currency: 'MYZ'
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/payout/withdraw — Request withdrawal to Tari address
router.post('/withdraw', async (req, res) => {
  try {
    const { userId, address, amount } = req.body;
    if (!userId || !address || !amount) {
      return res.status(400).json({ error: 'userId, address, and amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'amount must be positive' });
    }

    // Check available balance
    const completed = await Reward.aggregate([
      { $match: { userId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const withdrawn = await Reward.aggregate([
      { $match: { userId, status: 'withdrawn' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const available = (completed[0]?.total || 0) - (withdrawn[0]?.total || 0);

    if (amount > available) {
      return res.status(400).json({
        error: 'Insufficient balance',
        available,
        requested: amount,
        shortfall: amount - available
      });
    }

    // Create withdrawal record
    const withdrawal = new Reward({
      userId,
      amount: -amount, // negative = withdrawal
      reason: `Withdrawal to Tari: ${address.slice(0, 12)}...`,
      source: 'payout',
      status: 'pending'
    });
    await withdrawal.save();

    // Execute Tari transfer
    try {
      const result = await tariPayout.transferToAddress(userId, address, amount);

      withdrawal.txId = result.txId;
      withdrawal.status = 'withdrawn';
      withdrawal.metadata = {
        transferId: result.transferId,
        networkTxId: result.networkTxId,
        simulated: result.simulated || false
      };
      await withdrawal.save();

      res.json({
        success: true,
        withdrawal: {
          id: withdrawal._id,
          userId,
          amount,
          address,
          txId: result.txId,
          status: 'withdrawn',
          simulated: result.simulated || false,
          createdAt: withdrawal.createdAt
        }
      });
    } catch (txErr) {
      withdrawal.status = 'failed';
      withdrawal.metadata = { error: txErr.message };
      await withdrawal.save();
      throw txErr;
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/payout/history — Get withdrawal history
router.get('/history', async (req, res) => {
  try {
    const { userId, limit = 20 } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    
    const history = await Reward.find({
      userId,
      status: { $in: ['withdrawn', 'pending'] }
    }).sort({ createdAt: -1 }).limit(parseInt(limit));

    res.json({
      success: true,
      withdrawals: history.map(h => ({
        id: h._id,
        amount: Math.abs(h.amount),
        txId: h.txId,
        status: h.status,
        reason: h.reason,
        createdAt: h.createdAt
      }))
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/payout/status/:transferId — Check transfer status
router.get('/status/:transferId', (req, res) => {
  const status = tariPayout.getTransferStatus(req.params.transferId);
  if (!status) return res.status(404).json({ error: 'Transfer not found' });
  res.json({ success: true, transfer: status });
});

module.exports = router;
