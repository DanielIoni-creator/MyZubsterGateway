const express = require('express');
const router = express.Router();
const robotCode = require('../robot_code');
const robotBrain = require('../robot_brain');

router.post('/create', async (req, res) => {
  try {
    const { jobId, clientId, robotId, prompt, language, amount = 100, currency = 'MYZ' } = req.body;
    if (!jobId || !clientId || !robotId || !prompt) {
      return res.status(400).json({ error: 'Missing fields: jobId, clientId, robotId, prompt' });
    }
    try { robotBrain.getRobotStatus(robotId); } 
    catch (err) { return res.status(404).json({ error: 'Robot not found' }); }
    const result = await robotCode.createCodeJob(jobId, clientId, robotId, prompt, language, amount, currency);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
    const result = await robotCode.generateAndDeliverCode(jobId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pr', async (req, res) => {
  try {
    const { jobId, repo, branch, prTitle } = req.body;
    if (!jobId || !repo) {
      return res.status(400).json({ error: 'Missing jobId or repo' });
    }
    const result = await robotCode.createPullRequest(jobId, repo, branch, prTitle);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/job/:jobId', (req, res) => {
  try {
    const job = robotCode.getCodeJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/jobs', (req, res) => {
  try {
    const jobs = robotCode.listCodeJobs();
    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
