const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraAuto,
  getAuto,
  getAutoDetails,
  updateAuto,
  deleteAuto,
  rifornisci,
  autoRefill,
  getStats
} = require('../controllers/autoController');

// Middleware di autenticazione per test
const testAuth = (req, res, next) => {
  // Usa un ObjectId valido per i test
  req.user = { 
    _id: new mongoose.Types.ObjectId('000000000000000000000001')
  };
  next();
};

// Usa auth per tutte le route
router.use(testAuth);

router.post('/registra', registraAuto);
router.get('/', getAuto);
router.get('/:id', getAutoDetails);
router.put('/:id', updateAuto);
router.delete('/:id', deleteAuto);
router.post('/rifornisci', rifornisci);
router.post('/:id/auto-refill', autoRefill);
router.get('/:id/stats', getStats);

module.exports = router;
