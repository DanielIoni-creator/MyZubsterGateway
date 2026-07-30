const express = require('express');
const router = express.Router();
const ActivityLog = require('../../models/ActivityLog');
const auth = require('../../middleware/auth');

router.get('/', (req, res) => {
  res.json({ success: true, data: [] });
});

router.get('/logs', auth, async (req, res) => {
  try {
    const logs = await ActivityLog.find({ user: req.user._id }).sort({ timestamp: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Errore nel recupero dei log' });
  }
});

module.exports = router;
