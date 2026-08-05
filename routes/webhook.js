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
  }
});

module.exports = router;
