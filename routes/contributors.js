const express = require('express');
const router = express.Router();
const Reward = require('../models/Reward');

// Endpoint per le statistiche dei contributor
router.get('/stats', async (req, res) => {
  try {
    const rewards = await Reward.find({ status: 'completed' });
    
    const contributorMap = new Map();
    let totalMYZ = 0;
    
    rewards.forEach(r => {
      totalMYZ += r.amount;
      if (contributorMap.has(r.userId)) {
        const existing = contributorMap.get(r.userId);
        existing.total += r.amount;
        existing.count += 1;
        existing.reasons.push(r.reason);
      } else {
        contributorMap.set(r.userId, {
          userId: r.userId,
          total: r.amount,
          count: 1,
          reasons: [r.reason],
          lastPayment: r.createdAt
        });
      }
    });
    
    const contributors = Array.from(contributorMap.values())
      .sort((a, b) => b.total - a.total);
    
    res.json({
      success: true,
      data: {
        totalContributors: contributors.length,
        totalMYZ: totalMYZ,
        contributors: contributors,
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Errore statistiche contributor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
