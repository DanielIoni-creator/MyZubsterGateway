const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const StablecoinPayment = require('../models/StablecoinPayment');
const stablecoinService = require('../services/stablecoinService');

// Create payment intent
router.post('/intent',
  body('amount').isFloat({ min: 0.01 }),
  body('currency').isIn(['USDC', 'USDT']),
  body('recipient').isString().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const intent = await stablecoinService.createPaymentIntent({
        amount: req.body.amount,
        currency: req.body.currency,
        recipient: req.body.recipient,
        metadata: req.body.metadata || {}
      });
      res.status(201).json(intent);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// Get payment status
router.get('/status/:paymentId', async (req, res) => {
  try {
    const payment = await StablecoinPayment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List payments with filters
router.get('/', async (req, res) => {
  try {
    const { currency, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (currency) query.currency = currency.toUpperCase();
    if (status) query.status = status;
    
    const payments = await StablecoinPayment.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await StablecoinPayment.countDocuments(query);
    
    res.json({ payments, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Conversion rate endpoint
router.get('/rates', async (req, res) => {
  try {
    const rates = await stablecoinService.getConversionRates();
    res.json(rates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
