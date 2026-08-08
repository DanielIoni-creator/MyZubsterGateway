const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraEva,
  getEva,
  getEvaDetails,
  updateEva,
  deleteEva,
  pianificaMissione,
  avviaMissione,
  completaMissione,
  raccogliRisorsa,
  getStats
} = require('../controllers/evaMarzianoController');

const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione robot
router.post('/', registraEva);
router.get('/', getEva);
router.get('/:id', getEvaDetails);
router.put('/:id', updateEva);
router.delete('/:id', deleteEva);

// Missioni
router.post('/:id/missioni', pianificaMissione);
router.post('/:id/missioni/:missioneId/avvia', avviaMissione);
router.post('/:id/missioni/:missioneId/completa', completaMissione);

// Risorse
router.post('/:id/risorse', raccogliRisorsa);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
