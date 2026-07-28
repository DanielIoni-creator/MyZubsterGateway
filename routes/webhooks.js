// routes/webhooks.js
const express = require('express');
const router = express.Router();
const webhookService = require('../services/webhookService');
const { authenticate } = require('../middleware/auth');
const { authorizeAdmin } = require('../middleware/admin');

router.use(authenticate);
router.use(authorizeAdmin);

// Create webhook
router.post('/', async (req, res) => {
  try {
    const { name, url, events, active, retryConfig } = req.body;
    if (!name || !url || !Array.isArray(events)) {
      return res.status(400).json({ error: 'name, url and events[] are required' });
    }
    const hook = await webhookService.createWebhook({ name, url, events, active, retryConfig });
    return res.status(201).json(hook);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// List webhooks
router.get('/', async (req, res) => {
  try {
    const hooks = await webhookService.listWebhooks();
    return res.json(hooks);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update webhook
router.put('/:id', async (req, res) => {
  try {
    const hook = await webhookService.updateWebhook(req.params.id, req.body);
    if (!hook) return res.status(404).json({ error: 'Webhook not found' });
    return res.json(hook);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete webhook
router.delete('/:id', async (req, res) => {
  try {
    const hook = await webhookService.deleteWebhook(req.params.id);
    if (!hook) return res.status(404).json({ error: 'Webhook not found' });
    return res.json({ message: 'Webhook deleted' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delivery status (optionally filtered by webhook id via ?webhook=)
router.get('/deliveries', async (req, res) => {
  try {
    const deliveries = await webhookService.getDeliveries(req.query.webhook);
    return res.json(deliveries);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
