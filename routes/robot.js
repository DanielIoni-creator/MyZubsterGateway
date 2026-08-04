const express = require('express');
const router = express.Router();
const robotBrain = require('../robot_brain');

// POST /api/robot/create
router.post('/create', (req, res) => {
  try {
    const { robotId, name, walletAddress } = req.body;
    const robot = robotBrain.createRobot(robotId, name, walletAddress);
    res.json({ success: true, data: robot });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/robot/assign
router.post('/assign', async (req, res) => {
  try {
    const { robotId, jobId, clientId, amount, currency } = req.body;
    const result = await robotBrain.assignJobToRobot(robotId, jobId, clientId, amount, currency);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/robot/execute
router.post('/execute', async (req, res) => {
  try {
    const { robotId } = req.body;
    const result = await robotBrain.executeJob(robotId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/robot/deliver
router.post('/deliver', async (req, res) => {
  try {
    const { robotId } = req.body;
    const result = await robotBrain.deliverJob(robotId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/robot/job/complete - COMPLETAMENTO JOB (uno step unico)
router.post('/job/complete', async (req, res) => {
  try {
    const { robotId, jobId } = req.body;
    if (!robotId || !jobId) {
      return res.status(400).json({ error: 'Missing robotId or jobId' });
    }

    // Verifica che il robot esista e abbia il job
    const robot = robotBrain.getRobotStatus(robotId);
    if (!robot) return res.status(404).json({ error: 'Robot not found' });
    if (robot.currentJob?.jobId !== jobId) {
      return res.status(400).json({ error: 'Job not assigned to this robot' });
    }

    // Esegue il lavoro (simulato)
    await robotBrain.executeJob(robotId);

    // Consegna
    const result = await robotBrain.deliverJob(robotId);

    res.json({
      success: true,
      message: 'Job completed and delivered',
      data: result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/robot/dispute
router.post('/dispute', async (req, res) => {
  try {
    const { robotId, jobId, reason } = req.body;
    const result = await robotBrain.handleDispute(robotId, jobId, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/robot/list
router.get('/list', (req, res) => {
  try {
    const robots = robotBrain.listRobots();
    res.json({ success: true, data: robots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/robot/status/:robotId
router.get('/status/:robotId', (req, res) => {
  try {
    const robot = robotBrain.getRobotStatus(req.params.robotId);
    res.json({ success: true, data: robot });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
