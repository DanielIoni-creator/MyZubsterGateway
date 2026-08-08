const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraNavicella,
  getNavicelle,
  getNavicella,
  updateNavicella,
  deleteNavicella,
  pianificaMissione,
  avviaMissione,
  completaMissione,
  rifornisciNavicella,
  getStats
} = require('../controllers/navicellaController');

// Middleware di autenticazione per test
const testAuth = (req, res, next) => {
  req.user = { 
    _id: new mongoose.Types.ObjectId('000000000000000000000001')
  };
  next();
};

router.use(testAuth);

// Gestione navicelle
router.post('/registra', registraNavicella);
router.get('/', getNavicelle);
router.get('/:id', getNavicella);
router.put('/:id', updateNavicella);
router.delete('/:id', deleteNavicella);

// Missioni
router.post('/missione', pianificaMissione);
router.post('/missione/:id/avvia', avviaMissione);
router.post('/missione/:id/completa', completaMissione);

// Rifornimento
router.post('/rifornisci', rifornisciNavicella);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
