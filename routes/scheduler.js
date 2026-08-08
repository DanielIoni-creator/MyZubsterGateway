// routes/scheduler.js — Robot Scheduler API — Bounty #786
const express = require('express');
const router = express.Router();
const scheduler = require('../services/scheduler');

// Registra robot
router.post('/robot/register', (req, res) => {
  try {
    const { robotId, capabilities } = req.body;
    if (!robotId) return res.status(400).json({ error: 'Missing robotId' });
    const robot = scheduler.registerRobot(robotId, capabilities || []);
    res.json({ success: true, data: robot });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Crea job
router.post('/job/enqueue', async (req, res) => {
  try {
    const { jobId, type, priority, payload, clientId } = req.body;
    if (!jobId || !type || !clientId) return res.status(400).json({ error: 'Missing jobId, type, or clientId' });
    const job = await scheduler.enqueueJob({ jobId, type, priority, payload, clientId });
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Completa job
router.post('/job/complete', async (req, res) => {
  try {
    const { robotId, jobId, result } = req.body;
    if (!robotId || !jobId) return res.status(400).json({ error: 'Missing robotId or jobId' });
    const job = await scheduler.completeJob(robotId, jobId, result || {});
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Fallisci job
router.post('/job/fail', async (req, res) => {
  try {
    const { jobId, reason } = req.body;
    if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
    const job = await scheduler.failJob(jobId, reason || 'Unknown error');
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Ping robot
router.post('/robot/ping', (req, res) => {
  try {
    const { robotId } = req.body;
    if (!robotId) return res.status(400).json({ error: 'Missing robotId' });
    const robot = scheduler.pingRobot(robotId);
    res.json({ success: true, data: robot });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Dashboard
router.get('/dashboard', (req, res) => {
  try {
    const dashboard = scheduler.getDashboard();
    res.json({ success: true, data: dashboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Queue status
router.get('/queue', (req, res) => {
  try {
    const queue = scheduler.getQueue();
    res.json({ success: true, data: queue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Robot status
router.get('/robot/:robotId', (req, res) => {
  try {
    const status = scheduler.getRobotStatus(req.params.robotId);
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
