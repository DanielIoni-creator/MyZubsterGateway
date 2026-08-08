const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  creaCitta,
  getCitta,
  getCittaDetails,
  updateCitta,
  deleteCitta,
  aggiungiZona,
  updateZona,
  aggiungiEdificio,
  getStats
} = require('../controllers/cittaLunareController');

const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione città
router.post('/', creaCitta);
router.get('/', getCitta);
router.get('/:id', getCittaDetails);
router.put('/:id', updateCitta);
router.delete('/:id', deleteCitta);

// Zone
router.post('/:id/zone', aggiungiZona);
router.put('/:id/zone/:zonaId', updateZona);

// Edifici
router.post('/:id/edifici', aggiungiEdificio);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
