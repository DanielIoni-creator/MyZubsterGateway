// routes/webhook.js
const express = require('express');
const router = express.Router();
const WebhookService = require('../services/webhookService');

router.post('/test-webhook', async (req, res) => {
  const { targetUrl, payload } = req.body;

  if (!targetUrl) {
    return res.status(400).json({ error: 'targetUrl è obbligatorio' });
  }

  console.log(`🧪 Test webhook verso ${targetUrl}`);

  try {
    const result = await WebhookService.sendWebhookAsync(
      targetUrl,
      payload || { test: true, timestamp: new Date().toISOString() }
    );

    res.json({
      success: true,
      result,
      message: 'Webhook inviato con retry automatico'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
