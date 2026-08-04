<<<<<<< HEAD
const express = require('express');
const router = express.Router();
const { verifySignature, handlePullRequestEvent } = require('../services/webhookService');

// POST /api/webhooks/github - GitHub webhook endpoint
router.post('/github', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const payload = req.body;
    
    // Verify HMAC signature
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
    if (!verifySignature(rawBody, signature)) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.headers['x-github-event'];
    
    if (event === 'pull_request') {
      const bodyData = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const result = await handlePullRequestEvent(event, bodyData);
      return res.json({ success: true, processed: result });
    }
    
    if (event === 'ping') {
      return res.json({ success: true, message: 'Webhook configured successfully' });
    }

    res.json({ success: true, message: 'Event received but not processed: ' + event });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/webhooks/github/logs - Get webhook logs
router.get('/github/logs', async (req, res) => {
  try {
    const WebhookLog = require('../models/WebhookLog');
    const limit = parseInt(req.query.limit) || 50;
    const logs = await WebhookLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
=======
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
>>>>>>> e7f3bf96a (feat(docker): add Docker Compose dev environment and Dockerfile (B9))
  }
});

module.exports = router;
