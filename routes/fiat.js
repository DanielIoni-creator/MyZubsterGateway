const express = require('express');
const router = express.Router();

const fiatTransactions = [];

const RATES = {
  USD: { MYZ: 200.0, EUR: 0.92, GBP: 0.78 },
  EUR: { MYZ: 217.4, USD: 1.09, GBP: 0.85 },
  GBP: { MYZ: 256.4, USD: 1.28, EUR: 1.18 },
};

// POST /api/fiat/pay - Process Fiat payment (USD/EUR/GBP)
router.post('/pay', (req, res) => {
  const { currency, amount, paymentMethod, reference } = req.body;

  if (!currency || !['USD', 'EUR', 'GBP'].includes(currency.toUpperCase())) {
    return res.status(400).json({ error: 'currency must be USD, EUR, or GBP' });
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const normalizedCurr = currency.toUpperCase();
  const tx = {
    id: `tx_fiat_${Date.now()}`,
    currency: normalizedCurr,
    amount,
    paymentMethod: paymentMethod || 'credit_card',
    reference: reference || '',
    myzEquivalent: Math.round(amount * RATES[normalizedCurr].MYZ),
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  };

  fiatTransactions.push(tx);
  res.status(201).json({ success: true, transaction: tx });
});

// GET /api/fiat/convert - Currency conversion calculator
router.get('/convert', (req, res) => {
  const { currency, amount, targetCurrency } = req.query;

  const normalizedCurr = (currency || 'USD').toUpperCase();
  const target = (targetCurrency || 'MYZ').toUpperCase();
  const numAmount = parseFloat(amount) || 1.0;

  if (!RATES[normalizedCurr]) {
    return res.status(400).json({ error: 'Unsupported fiat currency' });
  }

  const rate = RATES[normalizedCurr][target] || 1.0;
  const convertedAmount = Math.round(numAmount * rate * 100) / 100;

  res.json({
    currency: normalizedCurr,
    amount: numAmount,
    targetCurrency: target,
    rate,
    convertedAmount,
  });
});

// GET /api/fiat/dashboard - Fiat Gateway Summary
router.get('/dashboard', (req, res) => {
  res.json({
    totalTransactions: fiatTransactions.length,
    currencies: {
      USD: fiatTransactions.filter((t) => t.currency === 'USD').length,
      EUR: fiatTransactions.filter((t) => t.currency === 'EUR').length,
      GBP: fiatTransactions.filter((t) => t.currency === 'GBP').length,
    },
    recentTransactions: fiatTransactions.slice(-5).reverse(),
  });
});

module.exports = router;
