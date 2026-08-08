const express = require('express');
const router = express.Router();
const { getWalletBalance } = require('../controllers/walletController');

// GET /api/wallet/balance/:userId - Ottieni il saldo del wallet
router.get('/balance/:userId', getWalletBalance);

module.exports = router;
