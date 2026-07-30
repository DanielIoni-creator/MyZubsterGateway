const express = require('express');
const router = express.Router();
const Joi = require('joi');
const auth = require('../middleware/auth');
const escrowService = require('../services/escrowGatewayService');

// ─── Joi Schemas ─────────────────────────────────────────────────────────────

const createSchema = Joi.object({
  sellerId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
    .messages({ 'string.pattern.base': 'sellerId must be a valid ObjectId', 'any.required': 'sellerId is required' }),
  amount: Joi.number().positive().precision(8).required()
    .messages({ 'number.positive': 'amount must be a positive number', 'any.required': 'amount is required' }),
  currency: Joi.string().valid('XMR', 'token', 'USD').default('XMR'),
  multisigAddress: Joi.string().allow('').default(''),
  description: Joi.string().max(2000).allow('').default(''),
});

const fundSchema = Joi.object({
  moneroTxid: Joi.string().allow('').default(''),
  actor: Joi.string().default('system'),
});

const completeSchema = Joi.object({
  actor: Joi.string().default('buyer'),
  note: Joi.string().max(500).allow('').default(''),
});

const disputeSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(2000).required()
    .messages({ 'any.required': 'reason is required', 'string.empty': 'reason cannot be empty' }),
  actor: Joi.string().valid('buyer', 'seller').default('buyer'),
  evidence: Joi.array().items(
    Joi.object({
      description: Joi.string().max(500).default(''),
      url: Joi.string().uri().allow('').default(''),
    })
  ).default([]),
});

const resolveSchema = Joi.object({
  decision: Joi.string().valid('refund_buyer', 'release_seller', 'manual_review').required()
    .messages({ 'any.required': 'decision is required', 'any.only': 'decision must be one of: refund_buyer, release_seller, manual_review' }),
  resolvedBy: Joi.string().default('admin'),
  aiAnalysis: Joi.string().max(5000).allow('').default(''),
  note: Joi.string().max(500).allow('').default(''),
});

const refundSchema = Joi.object({
  actor: Joi.string().default('seller'),
  note: Joi.string().max(500).allow('').default(''),
});

const orderIdRegex = /^ESC-[0-9A-F]{4}-[0-9A-F]{4}$/;

// ─── Helper: Joi validation middleware ───────────────────────────────────────

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({
        success: false,
        error: { message: messages.join('; '), code: 'VALIDATION_ERROR' },
      });
    }
    req.body = value;
    next();
  };
}

// ─── Helper: async wrapper ───────────────────────────────────────────────────

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ─── POST /api/escrow - Create order ────────────────────────────────────────

router.post(
  '/',
  auth,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { sellerId, amount, currency, multisigAddress, description } = req.body;
    const order = await escrowService.createOrder(req.user._id, sellerId, amount, {
      currency,
      multisigAddress,
      description,
    });
    res.status(201).json({ success: true, data: order });
  })
);

// ─── GET /api/escrow - List orders (paginated + filtered) ────────────────────

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { buyerId, sellerId, status, search, page, limit } = req.query;
    const result = await escrowService.getOrderHistory(
      { buyerId, sellerId, status, search },
      page,
      limit
    );
    res.json({ success: true, ...result });
  })
);

// ─── GET /api/escrow/stats - Statistics ──────────────────────────────────────

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const { buyerId, sellerId } = req.query;
    const stats = await escrowService.getOrderStats({ buyerId, sellerId });
    res.json({ success: true, data: stats });
  })
);

// ─── GET /api/escrow/:id - Order detail ──────────────────────────────────────

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!orderIdRegex.test(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid order ID format (use ESC-XXXX-XXXX)', code: 'INVALID_ID' },
      });
    }

    const EscrowOrder = require('../models/EscrowOrder');
    const order = await EscrowOrder.findOne({ orderId: req.params.id })
      .populate('buyerId', '_id username')
      .populate('sellerId', '_id username');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { message: 'Order not found', code: 'NOT_FOUND' },
      });
    }

    res.json({ success: true, data: order });
  })
);

// ─── POST /api/escrow/:id/fund - Mark funded ─────────────────────────────────

router.post(
  '/:id/fund',
  auth,
  validate(fundSchema),
  asyncHandler(async (req, res) => {
    const order = await escrowService.fundOrder(req.params.id, {
      moneroTxid: req.body.moneroTxid,
      actor: req.body.actor,
    });
    res.json({ success: true, data: order });
  })
);

// ─── POST /api/escrow/:id/complete - Complete order ──────────────────────────

router.post(
  '/:id/complete',
  auth,
  validate(completeSchema),
  asyncHandler(async (req, res) => {
    const order = await escrowService.completeOrder(req.params.id, {
      actor: req.body.actor,
      note: req.body.note,
    });
    res.json({ success: true, data: order });
  })
);

// ─── POST /api/escrow/:id/dispute - Raise dispute ────────────────────────────

router.post(
  '/:id/dispute',
  auth,
  validate(disputeSchema),
  asyncHandler(async (req, res) => {
    const order = await escrowService.disputeOrder(req.params.id, req.body.reason, {
      actor: req.body.actor,
      evidence: req.body.evidence,
    });
    res.json({ success: true, data: order });
  })
);

// ─── POST /api/escrow/:id/resolve - Resolve dispute (AI or admin) ────────────

router.post(
  '/:id/resolve',
  auth,
  validate(resolveSchema),
  asyncHandler(async (req, res) => {
    const order = await escrowService.resolveDispute(
      req.params.id,
      req.body.decision,
      {
        resolvedBy: req.body.resolvedBy,
        aiAnalysis: req.body.aiAnalysis,
        note: req.body.note,
      }
    );
    res.json({ success: true, data: order });
  })
);

// ─── POST /api/escrow/:id/refund - Issue refund ──────────────────────────────

router.post(
  '/:id/refund',
  auth,
  validate(refundSchema),
  asyncHandler(async (req, res) => {
    const order = await escrowService.refundOrder(req.params.id, {
      actor: req.body.actor,
      note: req.body.note,
    });
    res.json({ success: true, data: order });
  })
);

// ─── Error handler ───────────────────────────────────────────────────────────

router.use((err, req, res, next) => {
  console.error('[EscrowRoute] Error:', err.message);

  if (err.code === 'INVALID_TRANSITION') {
    return res.status(409).json({
      success: false,
      error: { message: err.message, code: 'INVALID_TRANSITION' },
    });
  }

  if (err.code === 'NOT_FOUND') {
    return res.status(404).json({
      success: false,
      error: { message: err.message, code: 'NOT_FOUND' },
    });
  }

  if (err.code === 'VALIDATION_ERROR') {
    return res.status(400).json({
      success: false,
      error: { message: err.message, code: 'VALIDATION_ERROR' },
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: { message: err.message || 'Internal server error', code: 'INTERNAL_ERROR' },
  });
});

module.exports = router;
