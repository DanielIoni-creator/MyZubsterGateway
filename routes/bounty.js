const express = require('express');
const router = express.Router();
const bounty = require('../bounty.js');

console.log('🔍 routes/bounty.js loaded, bounty module:', typeof bounty);

router.get('/test', (req, res) => {
  console.log('✅ /test route called');
  res.json({ test: 'ok', bountyExists: !!bounty });
});

router.get('/list', (req, res) => {
  console.log('✅ /list route called');
  try {
    const data = bounty.listBounties();
    res.json({ success: true, data });
  } catch (err) {
    console.error('❌ /list error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/create', (req, res) => {
  try {
    const { issueId, rewardMYZ, assignedTo } = req.body;
    const data = bounty.createBounty(issueId, rewardMYZ, assignedTo);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/assign', (req, res) => {
  try {
    const { issueId, username } = req.body;
    const data = bounty.assignBounty(issueId, username);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/complete', (req, res) => {
  try {
    const { issueId, walletAddress } = req.body;
    const data = bounty.completeBounty(issueId, walletAddress);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
