const express = require('express');
const router = express.Router();
const robotLogo = require('../robot_logo');
const robotBrain = require('../robot_brain');

router.post('/create', async (req, res) => {
  try {
    const { jobId, clientId, robotId, prompt, style, amount = 100, currency = 'MYZ' } = req.body;
    if (!jobId || !clientId || !robotId || !prompt) {
      return res.status(400).json({ error: 'Missing fields: jobId, clientId, robotId, prompt' });
    }
    try { robotBrain.getRobotStatus(robotId); } 
    catch (err) { return res.status(404).json({ error: 'Robot not found' }); }
    const result = await robotLogo.createLogoJob(jobId, clientId, robotId, prompt, style, amount, currency);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
    const result = await robotLogo.generateAndDeliver(jobId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/job/:jobId', (req, res) => {
  try {
    const job = robotLogo.getLogoJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jobs', (req, res) => {
  try {
    const jobs = robotLogo.listLogoJobs();
    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
