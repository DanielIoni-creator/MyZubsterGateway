const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraEstrazione,
  getEstrazione,
  getEstrazioneDetails,
  updateEstrazione,
  deleteEstrazione,
  aggiungiSito,
  avviaEstrazione,
  purificaAcqua,
  vendiAcqua,
  getStats
} = require('../controllers/estrazioneAcquaMarteController');

const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione estrazione
router.post('/', registraEstrazione);
router.get('/', getEstrazione);
router.get('/:id', getEstrazioneDetails);
router.put('/:id', updateEstrazione);
router.delete('/:id', deleteEstrazione);

// Siti
router.post('/:id/siti', aggiungiSito);

// Estrazione
router.post('/:id/estrai', avviaEstrazione);

// Purificazione
router.post('/:id/purifica', purificaAcqua);

// Vendita
router.post('/:id/vendi', vendiAcqua);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
