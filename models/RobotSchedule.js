const express = require('express');
const router = express.Router();
const RobotSchedule = require('../models/RobotSchedule');
const crypto = require('crypto');

// POST /api/robot/schedule — Create a scheduled job
router.post('/schedule', async (req, res) => {
  try {
    const { robotId, jobId, cronExpression, intervalMinutes, jobData, maxRuns } = req.body;
    if (!robotId || !jobId) return res.status(400).json({ error: 'robotId and jobId required' });
    if (!cronExpression && !intervalMinutes) return res.status(400).json({ error: 'cronExpression or intervalMinutes required' });

    const scheduleId = crypto.randomUUID();
    const nextRunAt = intervalMinutes ? new Date(Date.now() + intervalMinutes * 60000) : new Date();
    const schedule = new RobotSchedule({ scheduleId, robotId, jobId, cronExpression, intervalMinutes, jobData: jobData || {}, maxRuns: maxRuns || null, nextRunAt });
    await schedule.save();
    res.status(201).json({ success: true, schedule });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/schedule
router.get('/schedule', async (req, res) => {
  try {
    const filter = {};
    if (req.query.robotId) filter.robotId = req.query.robotId;
    if (req.query.status) filter.status = req.query.status;
    const schedules = await RobotSchedule.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json({ schedules, count: schedules.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/schedule/:scheduleId
router.get('/schedule/:scheduleId', async (req, res) => {
  try {
    const s = await RobotSchedule.findOne({ scheduleId: req.params.scheduleId });
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json({ schedule: s });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/robot/schedule/:scheduleId
router.put('/schedule/:scheduleId', async (req, res) => {
  try {
    const s = await RobotSchedule.findOne({ scheduleId: req.params.scheduleId });
    if (!s) return res.status(404).json({ error: 'Not found' });
    if (req.body.status) s.status = req.body.status;
    if (req.body.cronExpression) s.cronExpression = req.body.cronExpression;
    if (req.body.intervalMinutes) { s.intervalMinutes = req.body.intervalMinutes; s.nextRunAt = new Date(Date.now() + req.body.intervalMinutes * 60000); }
    if (req.body.jobData) s.jobData = req.body.jobData;
    if (req.body.maxRuns !== undefined) s.maxRuns = req.body.maxRuns;
    await s.save();
    res.json({ success: true, schedule: s });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/robot/schedule/:scheduleId
router.delete('/schedule/:scheduleId', async (req, res) => {
  try {
    const r = await RobotSchedule.findOneAndDelete({ scheduleId: req.params.scheduleId });
    if (!r) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
