const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraStampante,
  getStampanti,
  getStampanteDetails,
  updateStampante,
  deleteStampante,
  creaProgetto,
  avviaStampa,
  completaStampa,
  aggiungiMateriali,
  getStats
} = require('../controllers/stampa3DController');

const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione stampante
router.post('/', registraStampante);
router.get('/', getStampanti);
router.get('/:id', getStampanteDetails);
router.put('/:id', updateStampante);
router.delete('/:id', deleteStampante);

// Progetti
router.post('/:id/progetti', creaProgetto);
router.post('/:id/progetti/:progettoId/avvia', avviaStampa);
router.post('/:id/progetti/:progettoId/completa', completaStampa);

// Materiali
router.post('/:id/materiali', aggiungiMateriali);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
