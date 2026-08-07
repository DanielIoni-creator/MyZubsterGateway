const express = require('express');
const { realtime, defaultAuthorize } = require('../services/realtimeService');

const router = express.Router();

router.get('/stats', (_req, res) => {
  return res.json({ success: true, data: realtime.stats() });
});

// Server-side publish hook. Other services call realtime.publish() directly;
// this exists for operators and integration tests.
router.post('/publish', (req, res) => {
  const { channel, event } = req.body || {};
  if (!channel) return res.status(400).json({ success: false, error: 'channel is required' });
  if (!defaultAuthorize(channel, { userId: String(channel).split(':')[1] })) {
    return res.status(400).json({ success: false, error: 'channel must look like <namespace>:<scope>' });
  }
  const delivered = realtime.fanout(channel, event ?? {});
  return res.json({ success: true, data: { channel, delivered } });
});

module.exports = router;
