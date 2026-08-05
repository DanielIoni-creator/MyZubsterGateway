// routes/robotSimulator.js — Simulator API endpoints (BOT-4, closes #341)
const express = require('express');
const router = express.Router();
const RobotSimulator = require('../robot_simulator');

// Singleton simulator (one per server instance)
const simulators = new Map();

function getSimulator(sessionId = 'default') {
  if (!simulators.has(sessionId)) {
    simulators.set(sessionId, new RobotSimulator({ currency: 'MYZ' }));
  }
  return simulators.get(sessionId);
}

// POST /api/robot/simulator/robot — Create a simulated robot
router.post('/simulator/robot', (req, res) => {
  try {
    const { name, type, sessionId } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const sim = getSimulator(sessionId);
    const robot = sim.createRobot(name, type || 'basic');
    res.status(201).json({ success: true, robot });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/robot/simulator/job — Create and assign a job
router.post('/simulator/job', (req, res) => {
  try {
    const { robotId, jobData, sessionId } = req.body;
    if (!robotId) return res.status(400).json({ error: 'robotId is required' });
    const sim = getSimulator(sessionId);
    const job = sim.createJob(robotId, jobData || {});
    res.status(201).json({ success: true, job });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/robot/simulator/job/:jobId/deliver — Manually deliver a job
router.post('/simulator/job/:jobId/deliver', (req, res) => {
  try {
    const sim = getSimulator(req.body.sessionId);
    const job = sim.deliverJob(req.params.jobId);
    res.json({ success: true, job });
  } catch (err) { res.status(404).json({ error: err.message }); }
});

// GET /api/robot/simulator/robots — List all simulated robots
router.get('/simulator/robots', (req, res) => {
  const sim = getSimulator(req.query.sessionId);
  res.json({ robots: sim.getRobots(), count: sim.getRobots().length });
});

// GET /api/robot/simulator/jobs — List jobs
router.get('/simulator/jobs', (req, res) => {
  const sim = getSimulator(req.query.sessionId);
  res.json({ jobs: sim.getJobs(req.query.status), count: sim.getJobs(req.query.status).length });
});

// GET /api/robot/simulator/summary — Simulation summary
router.get('/simulator/summary', (req, res) => {
  const sim = getSimulator(req.query.sessionId);
  res.json({ summary: sim.getSummary() });
});

// GET /api/robot/simulator/logs — Action logs
router.get('/simulator/logs', (req, res) => {
  const sim = getSimulator(req.query.sessionId);
  res.json({ logs: sim.getLogs(parseInt(req.query.limit) || 50) });
});

// POST /api/robot/simulator/loadtest — Start a load test
router.post('/simulator/loadtest', async (req, res) => {
  try {
    const { robotCount, jobsPerRobot, delay, sessionId } = req.body;
    const sim = getSimulator(sessionId);
    const result = await sim.loadTest({
      robotCount: robotCount || 5,
      jobsPerRobot: jobsPerRobot || 1,
      delay: delay || 100
    });
    res.json({ success: true, ...result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/robot/simulator/reset — Reset simulator
router.post('/simulator/reset', (req, res) => {
  const sim = getSimulator(req.body.sessionId);
  sim.reset();
  res.json({ success: true, message: 'Simulator reset' });
});

module.exports = router;
