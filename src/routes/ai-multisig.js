const express = require('express');
const router = express.Router();
const aiAgent = require('../services/ai-agent');

// Webhook endpoint for AI multisig agent
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    
    if (!payload.orderId || !payload.eventType) {
      return res.status(400).json({ error: 'Missing orderId or eventType in payload' });
    }

    const decision = await aiAgent.processWebhook(payload);
    
    res.status(200).json({
      success: true,
      decision
    });
  } catch (error) {
    console.error('[AI Agent Webhook Error]', error);
    res.status(500).json({ success: false, error: 'Internal server error processing AI webhook.' });
  }
});

module.exports = router;
