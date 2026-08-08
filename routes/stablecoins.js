const express = require('express');
const router = express.Router();

const stablecoinTransactions = [];

const RATES = {
  USDC: { USD: 1.0, EUR: 0.92, MYZ: 200 },
  USDT: { USD: 1.0, EUR: 0.92, MYZ: 200 },
};

// POST /api/stablecoins/pay - Process USDC or USDT payment
router.post('/pay', (req, res) => {
  const { asset, amount, recipientAddress, reference } = req.body;

  if (!asset || !['USDC', 'USDT'].includes(asset.toUpperCase())) {
    return res.status(400).json({ error: 'asset must be USDC or USDT' });
  }

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }

  const normalizedAsset = asset.toUpperCase();
  const tx = {
    id: `tx_stb_${Date.now()}`,
    asset: normalizedAsset,
    amount,
    recipientAddress: recipientAddress || '0x0000000000000000000000000000000000000000',
    reference: reference || '',
    myzEquivalent: amount * RATES[normalizedAsset].MYZ,
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  };

  stablecoinTransactions.push(tx);
  res.status(201).json({ success: true, transaction: tx });
});

// GET /api/stablecoins/convert - Automatic conversion calculation
router.get('/convert', (req, res) => {
  const { asset, amount, targetCurrency } = req.query;

  const normalizedAsset = (asset || 'USDC').toUpperCase();
  const target = (targetCurrency || 'MYZ').toUpperCase();
  const numAmount = parseFloat(amount) || 1.0;

  if (!RATES[normalizedAsset]) {
    return res.status(400).json({ error: 'Unsupported stablecoin asset' });
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

// GET /api/stablecoins/dashboard - Unified dashboard for stablecoins
router.get('/dashboard', (req, res) => {
  const usdcTx = stablecoinTransactions.filter((t) => t.asset === 'USDC');
  const usdtTx = stablecoinTransactions.filter((t) => t.asset === 'USDT');

  const usdcVolume = usdcTx.reduce((sum, t) => sum + t.amount, 0);
  const usdtVolume = usdtTx.reduce((sum, t) => sum + t.amount, 0);

  res.json({
    totalTransactions: stablecoinTransactions.length,
    usdc: {
      count: usdcTx.length,
      totalVolume: usdcVolume,
    },
    usdt: {
      count: usdtTx.length,
      totalVolume: usdtVolume,
    },
    totalVolumeUSD: usdcVolume + usdtVolume,
    recentTransactions: stablecoinTransactions.slice(-5).reverse(),
  });
});

module.exports = router;
