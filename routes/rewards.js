const express = require('express');
const router = express.Router();
const Reward = require('../models/Reward');
const { mint } = require('../token_simulator');

router.get('/', async (req, res) => {
  try {
    const { userId, limit = 50, page = 1 } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const skip = (page - 1) * limit;
    const rewards = await Reward.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    const total = await Reward.countDocuments({ userId });
    res.json({ success: true, data: rewards, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/trigger', async (req, res) => {
  try {
    const { userId, amount, reason, source = 'manual' } = req.body;
    if (!userId || !amount || !reason) return res.status(400).json({ error: 'Missing userId, amount, or reason' });
    const reward = new Reward({ userId, amount, reason, source, status: 'pending' });
    await reward.save();
    try {
      const txId = await mint(userId, amount);
      reward.txId = txId;
      reward.status = 'completed';
      await reward.save();
      res.json({ success: true, reward });
    } catch (mintErr) {
      reward.status = 'failed';
      reward.metadata = { error: mintErr.message };
      await reward.save();
      throw mintErr;
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
