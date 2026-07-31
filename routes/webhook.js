// routes/webhook.js
const express = require('express');
const router = express.Router();
const WebhookService = require('../services/webhookService');

router.post('/delivery', async (req, res) => {
  try {
    const log = await WebhookService.recordDeliveryWebhook({
      payload: req.body,
      signatureHeader: req.get('X-Webhook-Signature'),
      source: req.get('X-Webhook-Source') || 'seller',
    });

    res.status(log.status === 'verified' ? 201 : 202).json({
      success: true,
      data: {
        id: log._id,
        status: log.status,
        verification: log.verification,
        orderId: log.orderId,
        escrowId: log.escrowId,
      },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      error: error.message,
    });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const { orderId, escrowId, status, eventType, limit } = req.query;
    const filter = {};

    if (orderId) filter.orderId = orderId;
    if (escrowId) filter.escrowId = escrowId;
    if (status) filter.status = status;
    if (eventType) filter.eventType = eventType;

    const logs = await WebhookService.listLogs(filter, limit);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

router.post('/test-webhook', async (req, res) => {
  const { targetUrl, payload } = req.body;

  if (!targetUrl) {
    return res.status(400).json({
      error: req.t('validation.targetUrlRequired'),
    });
  }

  try {
    const result = await WebhookService.sendWebhookAsync(
      targetUrl,
      payload || { test: true, timestamp: new Date().toISOString() }
    );

    res.json({
      success: true,
      result,
      message: req.t('webhooks.sentWithRetry'),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
