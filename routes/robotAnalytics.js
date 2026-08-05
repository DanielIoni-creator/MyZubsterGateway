const express = require('express');
const { AnalyticsValidationError, createRobotAnalyticsService } = require('../services/robotAnalyticsService');

function createRobotAnalyticsRouter(service = createRobotAnalyticsService()) {
  const router = express.Router();

  router.post('/events', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await service.record(req.body || {}) });
    } catch (error) {
      res.status(error instanceof AnalyticsValidationError ? 400 : 500).json({ success: false, error: error.message });
    }
  });

  router.get('/summary', async (req, res) => {
    try {
      res.json({ success: true, data: await service.report(req.query) });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/report.csv', async (req, res) => {
    try {
      const csv = await service.csv(req.query);
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="robot-analytics.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}

module.exports = createRobotAnalyticsRouter();
module.exports.createRobotAnalyticsRouter = createRobotAnalyticsRouter;
