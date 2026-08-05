const express = require('express');
const router = express.Router();
const Robot = require('../models/Robot');

// API per ottenere metriche di performance
router.get('/', async (req, res) => {
  try {
    const topRobots = await Robot.find().sort({ engagementScore: -1 }).limit(10);
    const avgRoi = topRobots.reduce((acc, r) => acc + r.roi, 0) / (topRobots.length || 1);
    res.json({ success: true, topRobots, avgRoi });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Esporta i dati in formato CSV
router.get('/export', async (req, res) => {
  try {
    const robots = await Robot.find().lean();
    if (!robots.length) return res.send('No data');
    
    // Generazione CSV semplice
    const fields = Object.keys(robots[0]).filter(k => k !== '_id' && k !== '__v');
    const csvLines = [fields.join(',')];
    robots.forEach(r => {
      const row = fields.map(f => `"${String(r[f] || '').replace(/"/g, '""')}"`);
      csvLines.push(row.join(','));
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="robot-analytics.csv"');
    res.send(csvLines.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint per registrare un click/engagement
router.post('/engage/:id', async (req, res) => {
  try {
    await Robot.findByIdAndUpdate(req.params.id, { $inc: { engagementScore: 1 } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
