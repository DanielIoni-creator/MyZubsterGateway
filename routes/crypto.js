const express = require('express');
const router = express.Router();

const cryptoTransactions = [];

const RATES = {
  BTC: { USD: 65000.0, EUR: 59800.0, MYZ: 13000000 },
  ETH: { USD: 3500.0, EUR: 3220.0, MYZ: 700000 },
  ADA: { USD: 0.45, EUR: 0.41, MYZ: 90 },
};

// POST /api/crypto/pay - Process BTC, ETH, or ADA payment
router.post('/pay', (req, res) => {
  const { asset, amount, recipientAddress, reference } = req.body;

  if (!asset || !['BTC', 'ETH', 'ADA'].includes(asset.toUpperCase())) {
    return res.status(400).json({ error: 'asset must be BTC, ETH, or ADA' });
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const normalizedAsset = asset.toUpperCase();
  const tx = {
    id: `tx_cry_${Date.now()}`,
    asset: normalizedAsset,
    amount,
    recipientAddress: recipientAddress || '0x0000000000000000000000000000000000000000',
    reference: reference || '',
    myzEquivalent: amount * RATES[normalizedAsset].MYZ,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  };

  cryptoTransactions.push(tx);
  res.status(201).json({ success: true, transaction: tx });
});

// GET /api/crypto/convert - Automatic conversion calculation
router.get('/convert', (req, res) => {
  const { asset, amount, targetCurrency } = req.query;

  const normalizedAsset = (asset || 'ETH').toUpperCase();
  const target = (targetCurrency || 'MYZ').toUpperCase();
  const numAmount = parseFloat(amount) || 1.0;

  if (!RATES[normalizedAsset]) {
    return res.status(400).json({ error: 'Unsupported crypto asset' });
  }

  const rate = RATES[normalizedAsset][target] || 1.0;
  const convertedAmount = numAmount * rate;

  res.json({
    asset: normalizedAsset,
    amount: numAmount,
    targetCurrency: target,
    rate,
    convertedAmount,
  });
});

// GET /api/crypto/dashboard - Unified crypto payment dashboard
router.get('/dashboard', (req, res) => {
  res.json({
    totalTransactions: cryptoTransactions.length,
    assets: {
      BTC: cryptoTransactions.filter((t) => t.asset === 'BTC').length,
      ETH: cryptoTransactions.filter((t) => t.asset === 'ETH').length,
      ADA: cryptoTransactions.filter((t) => t.asset === 'ADA').length,
    },
    recentTransactions: cryptoTransactions.slice(-5).reverse(),
  });
});

module.exports = router;
