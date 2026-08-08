const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({ success: true, data: { status: 'online', network: 'testnet' } });
});

router.get('/balance', (req, res) => {
  res.json({ success: true, data: { balance: 0, formatted: '0.0000 XMR' } });
});

router.get('/address', (req, res) => {
  res.json({ success: true, data: { address: process.env.MONERO_WALLET_ADDRESS || 'Not configured' } });
});

router.post('/generate-subaddress', (req, res) => {
  res.json({ success: true, data: { subaddress: 'test-subaddress' } });
});

module.exports = router;
