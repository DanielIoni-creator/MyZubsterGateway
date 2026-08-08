const express = require('express');
const router = express.Router();
const { getSwapRate, executeSwap } = require('../controllers/swapController');

// GET /api/swap/rate?from=MYZ&to=MBFT - Ottieni tasso di cambio
router.get('/rate', getSwapRate);

// POST /api/swap/execute - Esegui lo swap
router.post('/execute', executeSwap);

module.exports = router;
