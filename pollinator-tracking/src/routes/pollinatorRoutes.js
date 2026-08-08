const express = require('express');
const router = express.Router();
const {
  trackPollinator,
  getObservations,
  getStats,
  getSpecies
} = require('../controllers/pollinatorController');

// Routes
router.post('/track', trackPollinator);
router.get('/observations', getObservations);
router.get('/stats', getStats);
router.get('/species/:species', getSpecies);

module.exports = router;
