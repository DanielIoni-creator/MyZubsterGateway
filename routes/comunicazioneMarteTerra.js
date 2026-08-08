const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraComunicazione,
  getComunicazione,
  getComunicazioneDetails,
  updateComunicazione,
  deleteComunicazione,
  aggiungiCanale,
  inviaMessaggio,
  getStats
} = require('../controllers/comunicazioneMarteTerraController');

const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione sistema comunicazione
router.post('/', registraComunicazione);
router.get('/', getComunicazione);
router.get('/:id', getComunicazioneDetails);
router.put('/:id', updateComunicazione);
router.delete('/:id', deleteComunicazione);

// Canali
router.post('/:id/canali', aggiungiCanale);

// Messaggi
router.post('/:id/messaggi/invia', inviaMessaggio);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
