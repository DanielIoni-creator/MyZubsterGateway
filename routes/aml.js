const express = require('express');
const {
  AmlMonitoringService,
  createAuthorityReporter,
  createScreeningClient,
} = require('../services/amlMonitoringService');

const router = express.Router();
const service = new AmlMonitoringService({
  screening: createScreeningClient({ url: process.env.AML_SCREENING_URL, token: process.env.AML_SCREENING_TOKEN }),
  reporter: createAuthorityReporter({ url: process.env.AML_AUTHORITY_REPORT_URL, token: process.env.AML_AUTHORITY_REPORT_TOKEN }),
  reportThreshold: Number(process.env.AML_REPORT_THRESHOLD) || 70,
  largeTransfer: Number(process.env.AML_LARGE_TRANSFER_THRESHOLD) || 10000,
});

router.post('/transactions', async (req, res) => {
  try {
    return res.status(201).json({ success: true, data: await service.monitor(req.body) });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});
router.get('/transactions', (_req, res) => res.json({ success: true, data: service.transactions }));
router.get('/alerts', (_req, res) => res.json({ success: true, data: service.alerts }));
router.get('/reports', (_req, res) => res.json({ success: true, data: service.reports }));
router.post('/alerts/:id/resolve', (req, res) => {
  try {
    return res.json({ success: true, data: service.resolveAlert(req.params.id, req.body.resolution) });
  } catch (error) {
    return res.status(404).json({ success: false, error: error.message });
  }
});
router.get('/stream', (req, res) => {
  res.setHeader('content-type', 'text/event-stream');
  res.setHeader('cache-control', 'no-cache');
  res.flushHeaders?.();
  const send = (alert) => res.write(`event: alert\ndata: ${JSON.stringify(alert)}\n\n`);
  service.on('alert', send);
  req.on('close', () => service.off('alert', send));
});

module.exports = router;
module.exports.service = service;
