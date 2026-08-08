const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  creaBase,
  getBasi,
  getBaseDetails,
  updateBase,
  deleteBase,
  aggiungiModulo,
  rimuoviModulo,
  aggiungiEquipaggio,
  pianificaMissione,
  avviaMissione,
  completaMissione,
  getStats
} = require('../controllers/baseMarteController');

const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione base
router.post('/', creaBase);
router.get('/', getBasi);
router.get('/:id', getBaseDetails);
router.put('/:id', updateBase);
router.delete('/:id', deleteBase);

// Moduli
router.post('/:id/moduli', aggiungiModulo);
router.delete('/:id/moduli/:moduloId', rimuoviModulo);

// Equipaggio
router.post('/:id/equipaggio', aggiungiEquipaggio);

// Missioni
router.post('/:id/missioni', pianificaMissione);
router.post('/:id/missioni/:missioneId/avvia', avviaMissione);
router.post('/:id/missioni/:missioneId/completa', completaMissione);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
