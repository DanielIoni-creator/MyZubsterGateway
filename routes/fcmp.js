// routes/fcmp.js
// FCMP++ API Routes for MyZubsterGateway

const express = require('express');
const Joi = require('joi');
const FCMPTransactionService = require('../services/fcmpTransactionService');
const { isEnabled, getStatus, getConfig, validateConfig } = require('../services/fcmpConfig');

const router = express.Router();
const fcmpService = new FCMPTransactionService();

/**
 * Validation schemas
 */
const createTransactionSchema = Joi.object({
  destination: Joi.string().length(95).pattern(/^4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/).required()
    .messages({
      'string.pattern.base': 'Invalid Monero address format',
      'string.length': 'Monero address must be 95 characters',
      'any.required': 'Destination address is required'
    }),
  amount: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Amount must be a number',
      'number.integer': 'Amount must be an integer (atomic units)',
      'number.positive': 'Amount must be positive',
      'any.required': 'Amount is required'
    }),
  paymentId: Joi.string().pattern(/^[a-f0-9]{64}$/i).optional()
    .messages({
      'string.pattern.base': 'Payment ID must be 64 hex characters'
    }),
  proofFormat: Joi.string().valid('seraphis', 'fcmp', 'fcmp-plus-plus').optional(),
  useFCMP: Joi.boolean().optional()
});

const verifyTransactionSchema = Joi.object({
  txId: Joi.string().pattern(/^[a-f0-9]{64}$/i).required()
    .messages({
      'string.pattern.base': 'Transaction ID must be 64 hex characters',
      'any.required': 'Transaction ID is required'
    }),
  proofFormat: Joi.string().valid('seraphis', 'fcmp', 'fcmp-plus-plus').optional()
});

const edgeCaseSchema = Joi.object({
  edgeCase: Joi.string().valid(
    'ring-size-mismatch',
    'proof-format-incompatible',
    'network-activation-pending',
    'fallback-to-ringct'
  ).required(),
  params: Joi.object().optional()
});

/**
 * Format validation error response
 */
function formatError(err) {
  return err.details.map(d => d.message);
}

/**
 * POST /api/fcmp/transaction/create
 * Create an FCMP++ or RingCT transaction
 */
router.post('/transaction/create', async (req, res) => {
  try {
    const { error, value } = createTransactionSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        success: false,
        errors: formatError(error)
      });
    }

    const result = await fcmpService.createTransaction(value);

    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/fcmp/transaction/:txId/verify
 * Verify an FCMP++ transaction
 */
router.get('/transaction/:txId/verify', async (req, res) => {
  try {
    const { error, value } = verifyTransactionSchema.validate({
      txId: req.params.txId,
      proofFormat: req.query.proofFormat
    }, { abortEarly: false, stripUnknown: true });

    if (error) {
      return res.status(400).json({
        success: false,
        errors: formatError(error)
      });
    }

    const result = await fcmpService.verifyTransaction(value);

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/fcmp/status
 * Get FCMP++ network status
 */
router.get('/status', (req, res) => {
  try {
    const status = getStatus();
    return res.json({
      success: true,
      data: status
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/fcmp/config
 * Get FCMP++ configuration
 */
router.get('/config', (req, res) => {
  try {
    const config = getConfig();
    const validation = validateConfig();

    return res.json({
      success: true,
      data: {
        ...config,
        validation
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/fcmp/edge-case/handle
 * Handle FCMP++ edge cases
 */
router.post('/edge-case/handle', async (req, res) => {
  try {
    const { error, value } = edgeCaseSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        success: false,
        errors: formatError(error)
      });
    }

    const result = await fcmpService.handleEdgeCase(value.edgeCase, value.params || {});

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
