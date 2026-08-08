const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraEstrattore,
  getEstrattori,
  getEstrattoreDetails,
  updateEstrattore,
  deleteEstrattore,
  avviaEstrazione,
  completaEstrazione,
  vendiRisorsa,
  getStats
} = require('../controllers/estrazioneRisorseController');

const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione estrattore
router.post('/', registraEstrattore);
router.get('/', getEstrattori);
router.get('/:id', getEstrattoreDetails);
router.put('/:id', updateEstrattore);
router.delete('/:id', deleteEstrattore);

// Operazioni
router.post('/:id/estrai', avviaEstrazione);
router.post('/:id/estrai/:operazioneId/completa', completaEstrazione);

// Vendita
router.post('/:id/vendi', vendiRisorsa);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
