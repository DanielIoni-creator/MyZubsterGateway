const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');

// POST /api/analytics/track - Record an event
router.post('/track', async (req, res) => {
  try {
    const { event, userId, resource, resourceId, value, metadata } = req.body;
    if (!event) return res.status(400).json({ error: 'event required' });
    const entry = new Analytics({ event, userId, resource, resourceId, value: value || 0, metadata });
    await entry.save();
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics - Query analytics with aggregation
router.get('/', async (req, res) => {
  try {
    const { period = 'day', startDate, endDate, event } = req.query;
    const now = new Date();
    let since = new Date();
    
    switch(period) {
      case 'day': since.setDate(now.getDate() - 1); break;
      case 'week': since.setDate(now.getDate() - 7); break;
      case 'month': since.setMonth(now.getMonth() - 1); break;
      case 'all': since = new Date(0); break;
      default: since.setDate(now.getDate() - 1);
    }
    if (startDate) since = new Date(startDate);
    const until = endDate ? new Date(endDate) : now;

    const match = { timestamp: { '$gte': since, '$lte': until } };
    if (event) match.event = event;

    const [dailyCounts, topEvents, totalEvents] = await Promise.all([
      Analytics.aggregate([
        { '$match': match },
        { '$group': { _id: { '$dateToString': { format: '%Y-%m-%d', date: '$timestamp' } }, count: { '$sum': 1 } } },
        { '$sort': { _id: 1 } }
      ]),
      Analytics.aggregate([
        { '$match': match },
        { '$group': { _id: '$event', count: { '$sum': 1 }, totalValue: { '$sum': '$value' } } },
        { '$sort': { count: -1 } },
        { '$limit': 10 }
      ]),
      Analytics.countDocuments(match)
    ]);

    res.json({
      success: true,
      data: {
        period,
        totalEvents,
        dailyCounts,
        topEvents,
        dateRange: { from: since.toISOString(), to: until.toISOString() }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/summary - Dashboard summary
router.get('/summary', async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [total, dailyAvg, uniqueUsers, recentEvents] = await Promise.all([
      Analytics.countDocuments({ timestamp: { '$gte': since } }),
      Analytics.aggregate([
        { '$match': { timestamp: { '$gte': since } } },
        { '$group': { _id: { '$dateToString': { format: '%Y-%m-%d', date: '$timestamp' } }, count: { '$sum': 1 } } }
      ]),
      Analytics.distinct('userId', { timestamp: { '$gte': since } }),
      Analytics.find().sort({ timestamp: -1 }).limit(5).lean()
    ]);
    const avg = dailyAvg.length > 0 ? Math.round(dailyAvg.reduce((s, d) => s + d.count, 0) / dailyAvg.length) : 0;
    res.json({
      success: true,
      data: { totalEvents7d: total, dailyAverage: avg, uniqueUsers: uniqueUsers.length, recentEvents }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
