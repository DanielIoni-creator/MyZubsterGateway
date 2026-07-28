const express = require('express');
const router = express.Router();
const WebhookService = require('../services/webhookService');

router.post('/test', async (req, res) => {
  try {
    const { targetUrl, payload } = req.body;
    if (!targetUrl) {
      return res.status(400).json({ error: 'targetUrl is required' });
    }
    const result = await WebhookService.sendWebhookAsync(targetUrl, payload || { test: true });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
