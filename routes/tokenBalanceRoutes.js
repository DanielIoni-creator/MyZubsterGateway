const express = require('express');
const router = express.Router();
const { getTokenBalances } = require('../controllers/tokenBalanceController');

// GET /api/tokens/balance/:userId
router.get('/balance/:userId', getTokenBalances);

module.exports = router;
