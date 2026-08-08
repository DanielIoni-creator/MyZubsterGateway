const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraSerre,
  getSerre,
  getSerreDetails,
  updateSerre,
  deleteSerre,
  aggiungiSerra,
  piantaColtura,
  raccogliColtura,
  getStats
} = require('../controllers/serreMarteController');

const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione serre
router.post('/', registraSerre);
router.get('/', getSerre);
router.get('/:id', getSerreDetails);
router.put('/:id', updateSerre);
router.delete('/:id', deleteSerre);

// Serra
router.post('/:id/serre', aggiungiSerra);

// Colture
router.post('/:id/serre/:serraId/pianta', piantaColtura);
router.post('/:id/serre/:serraId/raccogli/:colturaId', raccogliColtura);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
