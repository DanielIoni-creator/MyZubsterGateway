const express = require('express');
const router = express.Router();
const Garden = require('../models/Garden');
const GardenMetric = require('../models/GardenMetric');

// Real-time dashboard data
router.get('/', async (req, res) => {
  try {
    const [totalGardens, totalArea, cropCounts, recentMetrics] = await Promise.all([
      Garden.countDocuments({ isActive: true }),
      Garden.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$area_sqm' } } }
      ]),
      Garden.aggregate([
        { $unwind: '$crops' },
        { $group: { _id: '$crops', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      GardenMetric.find()
        .sort({ timestamp: -1 })
        .limit(50)
        .lean()
    ]);

    res.json({
      summary: {
        totalGardens,
        totalArea_sqm: totalArea[0]?.total || 0,
        avgArea_sqm: totalGardens > 0 ? (totalArea[0]?.total || 0) / totalGardens : 0
      },
      topCrops: cropCounts.map(c => ({ crop: c._id, gardens: c.count })),
      recentMetrics,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historical data
router.get('/history', async (req, res) => {
  try {
    const { days = 30, metric } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 86400000);
    
    const filter = { timestamp: { $gte: since } };
    if (metric) filter.metric = metric;
    
    const history = await GardenMetric.find(filter)
      .sort({ timestamp: 1 })
      .lean();
    
    res.json({ history, days: parseInt(days), count: history.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Record a metric
router.post('/metrics', async (req, res) => {
  try {
    const { gardenId, metric, value, unit } = req.body;
    const record = new GardenMetric({ gardenId, metric, value, unit });
    await record.save();
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export report
router.get('/report', async (req, res) => {
  try {
    const [gardens, metrics] = await Promise.all([
      Garden.find({ isActive: true }).select('name area_sqm crops location').lean(),
      GardenMetric.aggregate([
        { $group: { _id: '$metric', avg: { $avg: '$value' }, min: { $min: '$value' }, max: { $max: '$value' }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      reportType: 'garden_dashboard',
      generatedAt: new Date().toISOString(),
      gardens: {
        total: gardens.length,
        items: gardens
      },
      metrics: {
        aggregated: metrics
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
