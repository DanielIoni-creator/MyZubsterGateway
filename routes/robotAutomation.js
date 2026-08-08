const express = require('express');
const router = express.Router();
const automationService = require('../services/robotAutomationService');

// POST /robot-automation/select — Selezione automatica robot migliore
router.post('/select', async (req, res) => {
  try {
    const result = await automationService.selectBestRobot(req.body);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /robot-automation/optimize — Ottimizzazione automatica job
router.post('/optimize', async (req, res) => {
  try {
    const result = await automationService.optimizeJobs();
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /robot-automation/monitor — Monitoraggio autonomo
router.get('/monitor', async (req, res) => {
  try {
    const status = await automationService.monitorRobots();
    res.json({ success: true, ...status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /robot-automation/dashboard — Dashboard agenti
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await automationService.getAgentDashboard();
    res.json({ success: true, dashboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
