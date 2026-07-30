const express = require('express');
const router = express.Router();
const axios = require('axios');
const Joi = require('joi');
const WebhookOutboundService = require('../services/webhookOutboundService');
const WebhookSubscription = require('../models/WebhookSubscription');
const WebhookDelivery = require('../models/WebhookDelivery');

/* ───── Schemas ───── */

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

const subscriptionPatchSchema = Joi.object({
  url: Joi.string().uri().optional(),
  events: Joi.array().items(Joi.string()).min(1).optional(),
  description: Joi.string().allow('').optional(),
  active: Joi.boolean().optional(),
  retryConfig: Joi.object({
    maxAttempts: Joi.number().integer().min(1).max(20).optional(),
    initialDelayMs: Joi.number().integer().min(1000).optional(),
    maxDelayMs: Joi.number().integer().min(5000).optional(),
  }).optional(),
}).min(1);

/* ───── Middleware ───── */

function validateCreate(req, res, next) {
  const { error } = subscriptionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }
  next();
}

function validatePatch(req, res, next) {
  const { error } = subscriptionPatchSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }
  next();
}

async function resolveSubscription(req, res, next) {
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

/* ───── Routes ───── */

/**
 * POST /api/webhooks
 * Create a new webhook subscription.
 */
router.post('/', validateCreate, async (req, res) => {
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

/**
 * GET /api/webhooks
 * List subscriptions with optional filtering and pagination.
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, active, event } = req.query;
    const filter = {};
    if (active !== undefined) filter.active = active === 'true';
    if (event) filter.events = event;

    const subscriptions = await WebhookSubscription.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await WebhookSubscription.countDocuments(filter);

    res.json({
      success: true,
      data: subscriptions,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/webhooks/:id
 * Get a single subscription.
 */
router.get('/:id', resolveSubscription, (req, res) => {
  const s = req.subscription;
  res.json({
    success: true,
    data: {
      id: s._id,
      url: s.url,
      events: s.events,
      active: s.active,
      secret: s.secret,
      description: s.description,
      retryConfig: s.retryConfig,
      metadata: s.metadata,
      lastTriggeredAt: s.lastTriggeredAt,
      failureCount: s.failureCount,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    },
  });
});

/**
 * PATCH /api/webhooks/:id
 * Update a subscription.
 */
router.patch('/:id', validatePatch, resolveSubscription, async (req, res) => {
  try {
    const allowed = ['url', 'events', 'active', 'description', 'retryConfig'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates['metadata.updatedAt'] = new Date();

    const updated = await WebhookSubscription.findByIdAndUpdate(
      req.subscription._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: updated.toObject() });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete a subscription and its deliveries.
 */
router.delete('/:id', resolveSubscription, async (req, res) => {
  try {
    await WebhookSubscription.findByIdAndDelete(req.subscription._id);
    await WebhookDelivery.deleteMany({ subscriptionId: req.subscription._id });
    res.json({ success: true, message: 'Webhook subscription deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/webhooks/:id/regenerate-secret
 * Regenerate the signing secret for a subscription.
 */
router.post('/:id/regenerate-secret', resolveSubscription, async (req, res) => {
  try {
    const newSecret = WebhookOutboundService.generateSecret();
    req.subscription.secret = newSecret;
    req.subscription.metadata.updatedAt = new Date();
    await req.subscription.save();

    res.json({ success: true, data: { id: req.subscription._id, secret: newSecret } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/webhooks/:id/test
 * Send a test webhook to the subscription URL.
 */
router.post('/:id/test', resolveSubscription, async (req, res) => {
  try {
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      subscriptionId: req.subscription._id.toString(),
      message: 'This is a test webhook delivery',
    };

    const result = await WebhookOutboundService.dispatchWebhook(
      req.subscription, 'webhook.test', testPayload
    );

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

/**
 * POST /api/webhooks/test
 * Standalone test — send a payload to an arbitrary URL without a subscription.
 */
router.post('/test', async (req, res) => {
  try {
    const { url, payload, secret } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'url is required' });
    }

    const testPayload = payload || { test: true, timestamp: new Date().toISOString() };
    const signature = secret
      ? WebhookOutboundService.signPayload(testPayload, secret)
      : undefined;

    const headers = { 'Content-Type': 'application/json', 'X-Webhook-Event': 'test' };
    if (signature) headers['X-Webhook-Signature'] = signature;

    const response = await axios.post(url, testPayload, {
      timeout: 10000,
      headers,
      validateStatus: () => true,
    });

    const success = response.status >= 200 && response.status < 300;
    res.json({
      success: true,
      data: {
        statusCode: response.status,
        success,
        body: String(response.data || '').slice(0, 2000),
        signature: signature || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      data: { statusCode: null, success: false },
    });
  }
});

/**
 * GET /api/webhooks/deliveries
 * List deliveries with filters and pagination.
 */
router.get('/deliveries', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, event, subscriptionId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (event) filter.event = event;
    if (subscriptionId) filter.subscriptionId = subscriptionId;

    const result = await WebhookOutboundService.listDeliveries(filter, page, limit);
    res.json({
      success: true,
      data: result.data,
      pagination: { page: result.page, limit: Number(limit), total: result.total, pages: result.pages },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/webhooks/deliveries/:id
 * Get a single delivery.
 */
router.get('/deliveries/:id', async (req, res) => {
  try {
    const delivery = await WebhookOutboundService.getDelivery(req.params.id);
    res.json({ success: true, data: delivery.toObject() });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/webhooks/deliveries/:id/retry
 * Retry a failed delivery.
 */
router.post('/deliveries/:id/retry', async (req, res) => {
  try {
    const result = await WebhookOutboundService.retryDelivery(req.params.id);
    res.json({
      success: true,
      data: {
        success: result.success,
        deliveryId: result.delivery._id,
        status: result.delivery.status,
        statusCode: result.statusCode || null,
        error: result.error || null,
        attempts: result.delivery.attempts.length,
      },
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/webhooks/stats/overview
 * Get aggregated webhook statistics.
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await WebhookOutboundService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
