const express = require('express');
const router = express.Router();
const {
  getUserDistributions,
  simulateDistribution
} = require('../controllers/distributionController');

// GET /api/distributions/:userId - Ottieni distribuzioni utente
router.get('/:userId', getUserDistributions);

// POST /api/distributions/simulate/:token - Simula distribuzione
router.post('/simulate/:token', simulateDistribution);

module.exports = router;
