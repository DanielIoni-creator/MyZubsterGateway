const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraTrasporto,
  getTrasporto,
  getTrasportoDetails,
  updateTrasporto,
  deleteTrasporto,
  aggiungiVeicolo,
  pianificaCorsa,
  completaCorsa,
  getStats
} = require('../controllers/trasportoLunareController');

const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione trasporto
router.post('/', registraTrasporto);
router.get('/', getTrasporto);
router.get('/:id', getTrasportoDetails);
router.put('/:id', updateTrasporto);
router.delete('/:id', deleteTrasporto);

// Veicoli
router.post('/:id/veicoli', aggiungiVeicolo);

// Corse
router.post('/:id/corse', pianificaCorsa);
router.post('/:id/corse/:corsaId/completa', completaCorsa);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
