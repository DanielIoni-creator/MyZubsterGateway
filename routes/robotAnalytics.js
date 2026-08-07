// routes/robotAnalytics.js — Robot Analytics Dashboard (BOT-9, closes #346)
const express = require('express');
const router = express.Router();

// In-memory analytics store (replace with DB in production)
const analyticsCache = new Map();

function computeAnalytics(robots, jobs, feedbacks) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  const robotsArr = Array.isArray(robots) ? robots : [];
  const jobsArr = Array.isArray(jobs) ? jobs : [];
  const feedbacksArr = Array.isArray(feedbacks) ? feedbacks : [];

  // Job metrics
  const jobsToday = jobsArr.filter(j => new Date(j.createdAt) >= today);
  const jobsThisWeek = jobsArr.filter(j => new Date(j.createdAt) >= weekAgo);
  const jobsThisMonth = jobsArr.filter(j => new Date(j.createdAt) >= monthAgo);

  const completedToday = jobsToday.filter(j => j.status === 'delivered' || j.status === 'completed');
  const completedWeek = jobsThisWeek.filter(j => j.status === 'delivered' || j.status === 'completed');
  const completedMonth = jobsThisMonth.filter(j => j.status === 'delivered' || j.status === 'completed');

  const failed = jobsArr.filter(j => j.status === 'failed');
  const pending = jobsArr.filter(j => j.status === 'assigned' || j.status === 'executing' || j.status === 'delivering');

  // Robot metrics
  const activeRobots = robotsArr.filter(r => r.status === 'working');
  const idleRobots = robotsArr.filter(r => r.status === 'idle');
  const totalJobsExecuted = robotsArr.reduce((s, r) => s + (r.stats?.jobsCompleted || 0 + (r.stats?.jobsFailed || 0)), 0);
  const totalEarned = robotsArr.reduce((s, r) => s + (r.stats?.totalEarned || 0), 0);

  // Jobs by day (last 7 days)
  const jobsByDay = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86400000);
    const dayStr = day.toISOString().slice(0, 10);
    const dayEnd = new Date(day.getTime() + 86400000);
    const count = jobsArr.filter(j => {
      const d = new Date(j.createdAt);
      return d >= day && d < dayEnd;
    }).length;
    jobsByDay.push({ date: dayStr, count });
  }

  // Top robots by earnings
  const topRobots = robotsArr
    .map(r => ({ robotId: r.robotId, name: r.name, completed: r.stats?.jobsCompleted || 0, earned: r.stats?.totalEarned || 0 }))
    .sort((a, b) => b.earned - a.earned)
    .slice(0, 10);

  // Top robots by rating (from feedbacks)
  const ratingMap = {};
  feedbacksArr.forEach(f => {
    if (!ratingMap[f.robotId]) ratingMap[f.robotId] = { sum: 0, count: 0 };
    ratingMap[f.robotId].sum += f.rating;
    ratingMap[f.robotId].count++;
  });
  const topRated = Object.entries(ratingMap)
    .map(([robotId, d]) => ({ robotId, avgRating: Math.round(d.sum / d.count * 10) / 10, count: d.count }))
    .filter(r => r.count >= 2)
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 10);

  // Success rate
  const successRate = totalJobsExecuted > 0 ? Math.round((completedMonth.length / totalJobsExecuted) * 100) : 100;

  // Robot type distribution
  const typeDist = {};
  robotsArr.forEach(r => { typeDist[r.type || 'unknown'] = (typeDist[r.type || 'unknown'] || 0) + 1; });

  return {
    summary: {
      totalRobots: robotsArr.length,
      activeNow: activeRobots.length,
      idleNow: idleRobots.length,
      totalJobs: jobsArr.length,
      completedToday: completedToday.length,
      completedWeek: completedWeek.length,
      completedMonth: completedMonth.length,
      failedTotal: failed.length,
      pendingNow: pending.length,
      successRate,
      totalEarned,
      currency: 'MYZ'
    },
    jobsByDay,
    topRobots,
    topRated,
    robotTypes: typeDist,
    alerts: generateAlerts(robotsArr, jobsArr),
    generatedAt: new Date().toISOString()
  };
}

function generateAlerts(robots, jobs) {
  const alerts = [];
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 3600000);

  // Robot inactive >24h
  robots.forEach(r => {
    if (r.status === 'idle' && r.lastActiveAt) {
      const last = new Date(r.lastActiveAt);
      if (now - last > 86400000) {
        alerts.push({ type: 'warning', robotId: r.robotId, message: `Robot ${r.name} inactive for >24h` });
      }
    }
  });

  // Job stuck >1h
  jobs.forEach(j => {
    if ((j.status === 'executing' || j.status === 'delivering') && j.startedAt) {
      const started = new Date(j.startedAt);
      if (now - started > 3600000) {
        alerts.push({ type: 'warning', jobId: j.jobId, message: `Job ${j.jobId} stuck in ${j.status} for >1h` });
      }
    }
  });

  return alerts;
}

// POST /api/robot/analytics — Compute analytics from provided data
router.post('/analytics', (req, res) => {
  try {
    const { robots, jobs, feedbacks } = req.body;
    const analytics = computeAnalytics(robots || [], jobs || [], feedbacks || []);
    const cacheKey = `analytics-${Date.now()}`;
    analyticsCache.set(cacheKey, analytics);
    setTimeout(() => analyticsCache.delete(cacheKey), 300000); // 5min cache
    res.json({ success: true, analytics });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/analytics/summary — Quick summary
router.get('/analytics/summary', (req, res) => {
  try {
    const { robots, jobs, feedbacks } = req.query;
    // Accept pre-parsed or empty (demo mode)
    const analytics = computeAnalytics(
      robots ? JSON.parse(robots) : [],
      jobs ? JSON.parse(jobs) : [],
      feedbacks ? JSON.parse(feedbacks) : []
    );
    res.json({ summary: analytics.summary });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/analytics/daily — Jobs by day chart data
router.get('/analytics/daily', (req, res) => {
  try {
    const { jobs } = req.query;
    const jobsArr = jobs ? JSON.parse(jobs) : [];
    const analytics = computeAnalytics([], jobsArr, []);
    res.json({ jobsByDay: analytics.jobsByDay });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/analytics/top — Top robots
router.get('/analytics/top', (req, res) => {
  try {
    const { robots } = req.query;
    const robotsArr = robots ? JSON.parse(robots) : [];
    const analytics = computeAnalytics(robotsArr, [], []);
    res.json({ topRobots: analytics.topRobots });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/analytics/alerts — Active alerts
router.get('/analytics/alerts', (req, res) => {
  try {
    const { robots, jobs } = req.query;
    const analytics = computeAnalytics(
      robots ? JSON.parse(robots) : [],
      jobs ? JSON.parse(jobs) : []
    );
    res.json({ alerts: analytics.alerts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
