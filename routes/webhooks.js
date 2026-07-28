const express = require('express');
const router = express.Router();
const Webhook = require('../models/Webhook');
const WebhookDelivery = require('../models/WebhookDelivery');
const webhookService = require('../services/webhook.service');

router.post('/', async (req, res) => {
  try {
    const webhook = await webhookService.registerWebhook(req.body);
    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.active !== undefined) {
      query.active = req.query.active === 'true';
    }
    if (req.query.event) {
      query.events = req.query.event;
    }

    const webhooks = await Webhook.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: webhooks });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) return res.status(404).json({ success: false, error: 'Webhook not found' });
    res.json({ success: true, data: webhook });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const webhook = await Webhook.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!webhook) return res.status(404).json({ success: false, error: 'Webhook not found' });
    res.json({ success: true, data: webhook });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const webhook = await Webhook.findByIdAndDelete(req.params.id);
    if (!webhook) return res.status(404).json({ success: false, error: 'Webhook not found' });
    res.json({ success: true, message: 'Webhook deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id/deliveries', async (req, res) => {
  try {
    const deliveries = await WebhookDelivery.find({ webhook: req.params.id })
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit || 50));
    res.json({ success: true, data: deliveries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/test', async (req, res) => {
  try {
    const webhook = await Webhook.findById(req.params.id);
    if (!webhook) return res.status(404).json({ success: false, error: 'Webhook not found' });

    const payload = {
      event: 'webhook.test',
      message: 'MyZubster test webhook',
      occurredAt: new Date().toISOString()
    };
    const delivery = await webhookService.createDelivery(webhook, 'webhook.test', payload);
    const result = await webhookService.deliver(webhook, delivery);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/events/order', async (req, res) => {
  try {
    const { event = 'order.updated', order = {} } = req.body;
    const payload = webhookService.buildOrderPayload(order, event);
    const deliveries = await webhookService.triggerEvent(event, payload);
    res.json({ success: true, data: deliveries });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
