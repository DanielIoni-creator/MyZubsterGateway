const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraFabbrica,
  getFabbriche,
  getFabbricaDetails,
  updateFabbrica,
  deleteFabbrica,
  aggiungiProdotto,
  creaOrdine,
  completaOrdine,
  aggiungiMateriePrime,
  getStats
} = require('../controllers/fabbricaMarteController');

const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione fabbrica
router.post('/', registraFabbrica);
router.get('/', getFabbriche);
router.get('/:id', getFabbricaDetails);
router.put('/:id', updateFabbrica);
router.delete('/:id', deleteFabbrica);

// Prodotti
router.post('/:id/prodotti', aggiungiProdotto);

// Ordini
router.post('/:id/ordini', creaOrdine);
router.post('/:id/ordini/:ordineId/completa', completaOrdine);

// Magazzino
router.post('/:id/materie-prime', aggiungiMateriePrime);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
