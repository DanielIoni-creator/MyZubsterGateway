const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraRobot,
  getRobot,
  getRobotDetails,
  updateRobot,
  deleteRobot,
  registraServizio,
  riceviDonazione,
  getStats,
  guidaPreghiera
} = require('../controllers/robotChiesaController');

// Middleware di autenticazione
const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Gestione robot
router.post('/', registraRobot);
router.get('/', getRobot);
router.get('/:id', getRobotDetails);
router.put('/:id', updateRobot);
router.delete('/:id', deleteRobot);

// Servizi
router.post('/:id/servizi', registraServizio);

// Donazioni
router.post('/:id/donazioni', riceviDonazione);

// Preghiera
router.post('/:id/preghiera', guidaPreghiera);

// Statistiche
router.get('/:id/stats', getStats);

module.exports = router;
