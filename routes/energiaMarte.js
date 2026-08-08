const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraEnergia,
  getEnergia,
  getEnergiaDetails,
  updateEnergia,
  deleteEnergia,
  avviaProduzione,
  consumaEnergia,
  getStats
} = require('../controllers/energiaMarteController');

const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione sistema energetico
router.post('/', registraEnergia);
router.get('/', getEnergia);
router.get('/:id', getEnergiaDetails);
router.put('/:id', updateEnergia);
router.delete('/:id', deleteEnergia);

// Produzione
router.post('/:id/produci', avviaProduzione);

// Consumo
router.post('/:id/consuma', consumaEnergia);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
