const express = require('express');
const router = express.Router();
const Analytics = require('../models/Analytics');

router.get('/robots/top', async (req, res) => {
  try {
    const { limit = 10, sortBy = 'roi' } = req.query;
    const robots = await Analytics.getTopRobots(parseInt(limit), sortBy);
    res.json({ success: true, data: { total: robots.length, sortBy, robots: robots.map(r => ({ robotId: r.robotId, name: r.name, category: r.category, roi: Math.round(r.roi * 100) / 100, jobsCompleted: r.jobsCompleted, totalEarned: r.totalEarned, engagementScore: r.engagementScore, revenuePerJob: Math.round(r.revenuePerJob * 100) / 100 })) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/roi', async (req, res) => {
  try { const roiData = await Analytics.getROIByCategory(); res.json({ success: true, data: { categories: roiData } }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/engagement', async (req, res) => {
  try { const data = await Analytics.getEngagementAnalytics(); res.json({ success: true, data: { byCategory: data } }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/robot/:robotId', async (req, res) => {
  try {
    const robot = await Analytics.findOne({ robotId: req.params.robotId });
    if (!robot) return res.status(404).json({ error: 'Not found' });
    const total = robot.jobsCompleted + robot.jobsFailed;
    res.json({ success: true, data: { robotId: robot.robotId, name: robot.name, category: robot.category, performance: { jobsCompleted: robot.jobsCompleted, jobsFailed: robot.jobsFailed, successRate: total > 0 ? Math.round((robot.jobsCompleted / total) * 10000) / 100 : 0, totalEarned: robot.totalEarned, totalSpent: robot.totalSpent, roi: Math.round(robot.roi * 100) / 100 }, engagement: { postsGenerated: robot.postsGenerated, engagementScore: robot.engagementScore }, lastActive: robot.lastActive } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/track', async (req, res) => {
  try {
    const { robotId, name, category, success, earned, spent } = req.body;
    if (!robotId) return res.status(400).json({ error: 'robotId required' });
    const a = await Analytics.trackJob(robotId, name, category || 'general', { success: success !== false, earned: earned || 0, spent: spent || 0 });
    res.json({ success: true, data: { robotId: a.robotId, roi: Math.round(a.roi * 100) / 100, jobsCompleted: a.jobsCompleted } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary', async (req, res) => {
  try {
    const [roiData, topRobots] = await Promise.all([Analytics.getROIByCategory(), Analytics.getTopRobots(5, 'roi')]);
    const all = await Analytics.find();
    res.json({ success: true, data: { overview: { totalRobots: all.length, totalJobs: all.reduce((s, r) => s + r.jobsCompleted, 0), totalRevenue: all.reduce((s, r) => s + r.totalEarned, 0), avgROI: all.length > 0 ? Math.round(all.reduce((s, r) => s + r.roi, 0) / all.length * 100) / 100 : 0, avgEngagement: all.length > 0 ? Math.round(all.reduce((s, r) => s + r.engagementScore, 0) / all.length) : 0 }, topRobots: topRobots.map(r => ({ robotId: r.robotId, name: r.name, roi: Math.round(r.roi * 100) / 100, jobsCompleted: r.jobsCompleted })), roiByCategory: roiData } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
