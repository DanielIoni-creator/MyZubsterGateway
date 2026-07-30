const express = require('express');
const router = express.Router();
const Joi = require('joi');
const WebhookOutboundService = require('../services/webhookOutboundService');
const WebhookSubscription = require('../models/WebhookSubscription');
const WebhookDelivery = require('../models/WebhookDelivery');

const subscriptionSchema = Joi.object({
  url: Joi.string().uri().required(),
  events: Joi.array().items(Joi.string()).min(1).required(),
  description: Joi.string().allow('').optional(),
  retryConfig: Joi.object({
    maxAttempts: Joi.number().integer().min(1).max(20).optional(),
    initialDelayMs: Joi.number().integer().min(1000).optional(),
    maxDelayMs: Joi.number().integer().min(5000).optional(),
  }).optional(),
});

function validateSubscription(req, res, next) {
  const { error } = subscriptionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }
  next();
}

async function getSubscription(req, res, next) {
  try {
    const subscription = await WebhookSubscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Webhook subscription not found' });
    }
    req.subscription = subscription;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

router.post('/', validateSubscription, async (req, res) => {
  try {
    const data = req.body;
    const secret = WebhookOutboundService.generateSecret();
    const subscription = await WebhookSubscription.create({
      ...data,
      secret,
      metadata: {
        createdBy: req.user?.id || 'system',
        createdAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: subscription._id,
        url: subscription.url,
        events: subscription.events,
        active: subscription.active,
        secret,
        description: subscription.description,
        retryConfig: subscription.retryConfig,
        createdAt: subscription.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, active } = req.query;
    const filter = {};
    if (active !== undefined) {
      filter.active = active === 'true';
    }

    const subscriptions = await WebhookSubscription.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await WebhookSubscription.countDocuments(filter);

    res.json({
      success: true,
      data: subscriptions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', getSubscription, (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.subscription._id,
      url: req.subscription.url,
      events: req.subscription.events,
      active: req.subscription.active,
      description: req.subscription.description,
      retryConfig: req.subscription.retryConfig,
      lastTriggeredAt: req.subscription.lastTriggeredAt,
      failureCount: req.subscription.failureCount,
      createdAt: req.subscription.createdAt,
      updatedAt: req.subscription.updatedAt,
    },
  });
});

router.patch('/:id', validateSubscription, getSubscription, async (req, res) => {
  try {
    const allowed = ['url', 'events', 'active', 'description', 'retryConfig'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    updates.metadata = { ...req.subscription.metadata, updatedAt: new Date() };

    const updated = await WebhookSubscription.findByIdAndUpdate(req.subscription._id, updates, { new: true });
    res.json({ success: true, data: updated.toObject() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', getSubscription, async (req, res) => {
  try {
    await WebhookSubscription.findByIdAndDelete(req.subscription._id);
    await WebhookDelivery.deleteMany({ subscriptionId: req.subscription._id });
    res.json({ success: true, message: 'Webhook subscription deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/:id/test', getSubscription, async (req, res) => {
  try {
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      subscriptionId: req.subscription._id.toString(),
      message: 'This is a test webhook delivery',
    };

    const result = await WebhookOutboundService.dispatchWebhook(req.subscription, 'webhook.test', testPayload);
    res.json({
      success: true,
      result: {
        delivered: result.success,
        statusCode: result.statusCode || null,
        error: result.error || null,
        deliveryId: result.delivery._id,
        attempts: result.delivery.attempts.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/deliveries', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, event, subscriptionId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (event) filter.event = event;
    if (subscriptionId) filter.subscriptionId = subscriptionId;

    const deliveries = await WebhookDelivery.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await WebhookDelivery.countDocuments(filter);

    res.json({
      success: true,
      data: deliveries,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await WebhookOutboundService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
