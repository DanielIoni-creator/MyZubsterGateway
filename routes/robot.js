const express = require('express');
const router = express.Router();
const robotBrain = require('../robot_brain');

router.post('/create', (req, res) => {
  try {
    const { robotId, name, walletAddress } = req.body;
    if (!robotId || !name || !walletAddress) {
      return res.status(400).json({ error: 'Missing robotId, name, or walletAddress' });
    }
    const robot = robotBrain.createRobot(robotId, name, walletAddress);
    res.json({ success: true, data: robot });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/assign', async (req, res) => {
  try {
    const { robotId, jobId, clientId, amount, currency } = req.body;
    if (!robotId || !jobId || !clientId || !amount || !currency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await robotBrain.assignJobToRobot(robotId, jobId, clientId, amount, currency);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/execute', async (req, res) => {
  try {
    const { robotId } = req.body;
    if (!robotId) return res.status(400).json({ error: 'Missing robotId' });
    const result = await robotBrain.executeJob(robotId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/deliver', async (req, res) => {
  try {
    const { robotId } = req.body;
    if (!robotId) return res.status(400).json({ error: 'Missing robotId' });
    const result = await robotBrain.deliverJob(robotId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/job/complete', async (req, res) => {
  try {
    const { robotId, jobId } = req.body;
    if (!robotId || !jobId) {
      return res.status(400).json({ error: 'Missing robotId or jobId' });
    }
    const robot = robotBrain.getRobotStatus(robotId);
    if (!robot) return res.status(404).json({ error: 'Robot not found' });
    if (robot.currentJob?.jobId !== jobId) {
      return res.status(400).json({ error: 'Job not assigned to this robot' });
    }
    await robotBrain.executeJob(robotId);
    const result = await robotBrain.deliverJob(robotId);
    res.json({ success: true, message: 'Job completed and delivered', data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/dispute', async (req, res) => {
  try {
    const { robotId, jobId, reason } = req.body;
    if (!robotId || !jobId || !reason) {
      return res.status(400).json({ error: 'Missing robotId, jobId, or reason' });
    }
    const result = await robotBrain.handleDispute(robotId, jobId, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/status/:robotId', (req, res) => {
  try {
    const robot = robotBrain.getRobotStatus(req.params.robotId);
    res.json({ success: true, data: robot });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
