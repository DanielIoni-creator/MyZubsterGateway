const express = require('express');
const router = express.Router();
const cryptoService = require('../services/cryptoService');

// GET /api/crypto/supported — List supported coins
router.get('/supported', (req, res) => {
  try {
    const coins = cryptoService.supported();
    res.json({ success: true, coins });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/crypto/address — Generate wallet address
router.post('/address', (req, res) => {
  try {
    const { coin } = req.body;
    if (!coin || !['BTC', 'ETH', 'ADA'].includes(coin.toUpperCase())) {
      return res.status(400).json({ success: false, error: 'Coin must be BTC, ETH, or ADA' });
    }
    const address = cryptoService.generateAddress(coin.toUpperCase());
    res.json({ success: true, coin: coin.toUpperCase(), address });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/crypto/balance — Check wallet balance
router.post('/balance', async (req, res) => {
  try {
    const { coin, address } = req.body;
    if (!coin || !address) {
      return res.status(400).json({ success: false, error: 'coin and address required' });
    }
    const balance = await cryptoService.getBalance(coin.toUpperCase(), address);
    res.json({ success: true, ...balance });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/crypto/transfer — Create a crypto transaction
router.post('/transfer', async (req, res) => {
  try {
    const { coin, from, to, amount } = req.body;
    if (!coin || !from || !to || !amount) {
      return res.status(400).json({ success: false, error: 'coin, from, to, amount required' });
    }
    const tx = await cryptoService.createTransaction(coin.toUpperCase(), from, to, amount);
    res.json({ success: true, transaction: tx });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/crypto/fees — Get fee schedule
router.get('/fees', (req, res) => {
  const fees = { BTC: '0.0001', ETH: '0.001', ADA: '0.17' };
  res.json({ success: true, fees, unit: 'native' });
});

module.exports = router;
