const express = require('express');
const router = express.Router();

// Webhook endpoint per AI verification
router.post('/webhook/verify', (req, res) => {
  res.status(201).json({
    success: true,
    data: { status: 'verified' }
  });
});

router.get('/webhook/status', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
