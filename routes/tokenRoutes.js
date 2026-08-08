const express = require('express');
const router = express.Router();
const { getTokens, getToken, getTokenYield } = require('../controllers/tokenController');

// GET /api/tokens - Ottieni tutti i token
router.get('/', getTokens);

// GET /api/tokens/:symbol - Ottieni un token specifico
router.get('/:symbol', getToken);

// GET /api/tokens/yield/:userId - Ottieni i rendimenti stimati
router.get('/yield/:userId', getTokenYield);

module.exports = router;
