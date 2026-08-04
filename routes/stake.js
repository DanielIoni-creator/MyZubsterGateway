const express = require('express');
const router = express.Router();
const stake = require('../stake_reputation.js');

router.post('/stake', (req, res) => {
  try { const { userId, amount, blocks } = req.body; res.json({ success: true, data: stake.stakeTokens(userId, amount, blocks) }); }
  catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/level/:userId', (req, res) => {
  try { res.json({ success: true, level: stake.getReputationLevel(req.params.userId) }); }
  catch (err) { res.status(404).json({ error: err.message }); }
});

router.get('/active', (req, res) => {
  try { res.json({ success: true, data: stake.listActiveStakes() }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
