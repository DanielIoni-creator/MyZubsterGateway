const express = require('express');
const router = express.Router();
const Referral = require('../models/Referral');
const Transaction = require('../models/Transaction');

// 1. Ottieni lo stato del referral
router.get('/:referrer', async (req, res) => {
  try {
    const referrals = await Referral.find({ referrer: req.params.referrer });
    const totalFees = referrals.reduce((sum, r) => sum + r.feeCollected, 0);
    res.json({
      referrer: req.params.referrer,
      totalRobotsCloned: referrals.length,
      totalFeesCollected: totalFees,
      referrals: referrals
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Ritira le fee accumulate
router.post('/withdraw', async (req, res) => {
  try {
    const { referrer, amount, address } = req.body;
    const referrals = await Referral.find({ referrer: referrer });
    const totalFees = referrals.reduce((sum, r) => sum + r.feeCollected, 0);
    if (totalFees < amount) {
      return res.status(400).json({ error: 'Insufficient fees' });
    }
    const transaction = new Transaction({
      robotId: `withdraw_${Date.now()}`,
      type: 'payment',
      amount: amount,
      referrer: referrer,
      status: 'pending'
    });
    await transaction.save();
    res.json({
      success: true,
      message: 'Withdrawal initiated',
      transaction: transaction
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
