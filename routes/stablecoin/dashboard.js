const express = require('express');
const router = express.Router();
const stablecoinService = require('../../services/stablecoinService');

// Unified dashboard
router.get('/', async (req, res) => {
  try {
    const dashboard = await stablecoinService.getUnifiedDashboard();
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
