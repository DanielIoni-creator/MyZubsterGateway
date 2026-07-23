const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

// POST /api/osint/scan
router.post('/scan', auth, async (req, res) => {
  try {
    const { target } = req.body;
    if (!target || !target.endsWith('.onion')) {
      return res.status(400).json({ error: 'Target onion valido richiesto' });
    }
    res.json({ success: true, message: 'OSINT scan avviato su ' + target });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
