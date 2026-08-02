const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/stats', (req, res) => {
  res.json({ success: true, data: { total: 0, pending: 0, claimed: 0 } });
});

router.post('/claim/:rewardId', (req, res) => {
  res.json({ success: true, message: 'Ricompensa reclamata' });
});

module.exports = router;
