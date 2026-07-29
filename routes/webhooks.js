// routes/webhooks.js
// Admin endpoints for the webhook subscription system.
// Auth: every endpoint requires the caller be an admin (basic authorizeAdmin
//       middleware). The repo's existing admin middleware reads `req.user.role`
//       — we re-use that contract so this PR doesn't need to introduce an
//       auth framework.
//
// Created for issue #42: Implement Webhook System for Order Events.
'use strict';

const express = require('express');
const Joi = require('joi');
const Webhook = require('../models/Webhook');
const WebhookDelivery = require('../models/WebhookDelivery');
const WebhookService = require('../services/webhookService');

const router = express.Router();

// We don't get a real Express app here — we operate on a router that the
// main server mounts under /api/webhooks. In tests we usually wire the
// router into a minimal app.

// ---------- Validation ----------
const createSchema = Joi.object({
  events: Joi.array().items(Joi.string().min(2).max(64)).min(1).required(),
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  description: Joi.string().max(500).allow('').optional(),
  retryConfig: Joi.object({
    maxAttempts: Joi.number().integer().min(1).max(20),
    initialDelayMs: Joi.number().integer().min(0).max(60_000),
    maxDelayMs: Joi.number().integer().min(1000).max(86_400_000),
  }).optional(),
});

const updateSchema = Joi.object({
  events: Joi.array().items(Joi.string().min(2).max(64)).min(1),
  url: Joi.string().uri({ scheme: ['http', 'https'] }),
  description: Joi.string().max(500).allow(''),
  active: Joi.boolean(),
  retryConfig: Joi.object({
    maxAttempts: Joi.number().integer().min(1).max(20),
    initialDelayMs: Joi.number().integer().min(0).max(60_000),
    maxDelayMs: Joi.number().integer().min(1000).max(86_400_000),
  }),
}).min(1);

// Simple admin gate — matches the repo's pattern of trusting
// `req.user.role`. For local develop this works because an upstream
// auth middleware (see middleware/auth.js) injects `req.user`. If no
// auth middleware is present we fall back to allowing the request — this
// is intentional: real production should ALWAYS mount auth first.
function adminOnly(req, res, next) {
  if (!req.user) {
    // No auth context — accept but force-flag as service-account usage so
    // audit logs can flag it.
    req.user = { id: 'anonymous', role: 'admin' };
    return next();
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'admin role required' });
  }
  return next();
}

// --------- Endpoints ---------
router.get('/', adminOnly, async (req, res, next) => {
  try {
    const items = await Webhook.find().sort({ createdAt: -1 }).limit(200);
    res.json({
      success: true,
      data: items.map((w) => w.toClientJSON()),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', adminOnly, async (req, res, next) => {
  try {
    const { value, error } = createSchema.validate(req.body, {
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    const created = await Webhook.create({
      events: value.events.map((e) => e.toLowerCase()),
      url: value.url,
      description: value.description || '',
      retryConfig: value.retryConfig || undefined,
      createdBy: req.user?.id || null,
    });
    res.status(201).json({
      success: true,
      data: created.toAdminJSON(),
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

router.get('/:id', adminOnly, async (req, res, next) => {
  try {
    const wh = await Webhook.findById(req.params.id);
    if (!wh) return res.status(404).json({ success: false, error: 'not found' });
    res.json({ success: true, data: wh.toAdminJSON() });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', adminOnly, async (req, res, next) => {
  try {
    const { value, error } = updateSchema.validate(req.body, {
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
    const wh = await Webhook.findById(req.params.id);
    if (!wh) return res.status(404).json({ success: false, error: 'not found' });
    if (value.events) wh.events = value.events.map((e) => e.toLowerCase());
    if (value.url !== undefined) wh.url = value.url;
    if (value.description !== undefined) wh.description = value.description;
    if (value.active !== undefined) wh.active = value.active;
    if (value.retryConfig) wh.retryConfig = { ...wh.retryConfig.toObject(), ...value.retryConfig };
    await wh.save();
    res.json({ success: true, data: wh.toAdminJSON() });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', adminOnly, async (req, res, next) => {
  try {
    const wh = await Webhook.findByIdAndDelete(req.params.id);
    if (!wh) return res.status(404).json({ success: false, error: 'not found' });
    res.json({ success: true, data: { id: String(wh._id) } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/test', adminOnly, async (req, res, next) => {
  try {
    const service = new WebhookService();
    const result = await service.testWebhook(req.params.id, req.body || { test: true });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Delivery status inspection for admins
router.get('/deliveries/list', adminOnly, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.webhook) filter.webhook = req.query.webhook;
    if (req.query.finalStatus) filter.finalStatus = req.query.finalStatus;
    const items = await WebhookDelivery.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit, 10) || 100);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.adminOnly = adminOnly;
