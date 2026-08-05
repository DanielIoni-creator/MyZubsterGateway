// routes/robotLogoAdvanced.js — Advanced Logo API (closes #387)
const express = require('express');
const router = express.Router();
const AdvancedLogoRobot = require('../robot_logo_advanced');

const logoRobot = new AdvancedLogoRobot();

// POST /api/robot/logo/brandkit — Generate complete brand kit
router.post('/logo/brandkit', async (req, res) => {
  try {
    const { name, industry, description, style } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const brand = await logoRobot.generateBrandKit({ name, industry: industry || 'tech', description, style });
    res.status(201).json({ success: true, brand });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/logo/brandkit/:brandId — Get brand by ID
router.get('/logo/brandkit/:brandId', (req, res) => {
  const brand = logoRobot.getBrand(req.params.brandId);
  if (!brand) return res.status(404).json({ error: 'Brand not found' });
  res.json({ brand });
});

// GET /api/robot/logo/brands — List all brands
router.get('/logo/brands', (req, res) => {
  res.json({ brands: logoRobot.getAllBrands(), count: logoRobot.getAllBrands().length });
});

// GET /api/robot/logo/palette — Suggest color palette
router.get('/logo/palette', (req, res) => {
  const { industry, style } = req.query;
  const palette = logoRobot._suggestPalette(industry, style);
  res.json({ industry: industry || 'default', palette });
});

// GET /api/robot/logo/logs — Get generation logs
router.get('/logo/logs', (req, res) => {
  res.json({ logs: logoRobot.getLogs(parseInt(req.query.limit) || 30) });
});

module.exports = router;
