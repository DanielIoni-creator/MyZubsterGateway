const express = require('express');
const router = express.Router();
const aiPaymentsService = require('../services/aiPaymentsService');

// POST /api/ai-payments/analyze — AI-powered payment risk analysis
router.post('/analyze', (req, res) => {
  try {
    const { amount, currency, sender, recipient, metadata } = req.body;
    if (!amount || !currency) {
      return res.status(400).json({ success: false, error: 'amount, currency required' });
    }
    const decision = aiPaymentsService.analyzePayment(
      Number(amount), currency.toUpperCase(), sender || 'anonymous', recipient || 'unknown', metadata || {}
    );
    res.json({ success: true, decision });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/ai-payments/route — Get optimal payment route
router.post('/route', (req, res) => {
  try {
    const { amount, currency } = req.body;
    if (!amount || !currency) {
      return res.status(400).json({ success: false, error: 'amount, currency required' });
    }
    const routes = aiPaymentsService.getOptimalRoute(Number(amount), currency.toUpperCase());
    res.json({ success: true, amount, currency: currency.toUpperCase(), routes });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/ai-payments/history — Payment decision history
router.get('/history', (req, res) => {
  try {
    const history = aiPaymentsService.getHistory();
    res.json({ success: true, ...history });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
