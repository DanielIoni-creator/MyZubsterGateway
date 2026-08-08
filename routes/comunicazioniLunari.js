const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraComunicazioni,
  getComunicazioni,
  getComunicazioniDetails,
  updateComunicazioni,
  deleteComunicazioni,
  aggiungiCanale,
  inviaMessaggio,
  getStats
} = require('../controllers/comunicazioniLunariController');

const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione sistema comunicazioni
router.post('/', registraComunicazioni);
router.get('/', getComunicazioni);
router.get('/:id', getComunicazioniDetails);
router.put('/:id', updateComunicazioni);
router.delete('/:id', deleteComunicazioni);

// Canali
router.post('/:id/canali', aggiungiCanale);

// Messaggi
router.post('/:id/messaggi/invia', inviaMessaggio);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
