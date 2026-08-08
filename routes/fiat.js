const express = require('express');
const router = express.Router();
const fiatService = require('../services/fiatService');

// GET /api/fiat/supported
router.get('/supported', (req, res) => {
  try {
    const info = fiatService.getSupported();
    res.json({ success: true, ...info });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/fiat/convert
router.post('/convert', (req, res) => {
  try {
    const { amount, from, to } = req.body;
    if (!amount || !from || !to) {
      return res.status(400).json({ success: false, error: 'amount, from, to required' });
    }
    const result = fiatService.convert(Number(amount), from.toUpperCase(), to.toUpperCase());
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// POST /api/fiat/payment
router.post('/payment', (req, res) => {
  try {
    const { method, amount, currency, recipient } = req.body;
    if (!method || !amount || !currency || !recipient) {
      return res.status(400).json({ success: false, error: 'method, amount, currency, recipient required' });
    }
    const payment = fiatService.createPayment(method, Number(amount), currency.toUpperCase(), recipient);
    res.json({ success: true, payment });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

module.exports = router;
