const express = require('express');
const router = express.Router();
const { getRateLimitStats, resetRateLimit } = require('../middleware/rateLimiter');

// GET /api/ratelimit/stats - Monitor rate limiting
router.get('/stats', (req, res) => {
  try {
    const stats = getRateLimitStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ratelimit/reset - Reset rate limit for a key (admin)
router.post('/reset', (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'key required' });
    const deleted = resetRateLimit(key);
    res.json({ success: true, reset: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
