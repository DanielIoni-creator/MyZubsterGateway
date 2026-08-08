const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const {
  registraRobot,
  getRobot,
  getRobotDetails,
  updateRobot,
  deleteRobot,
  registraDrone,
  getDroni,
  getDroneDetails,
  avviaMissione,
  completaMissione,
  getStats,
  pagaMissione
} = require('../controllers/robotMilitareController');

// Middleware di autenticazione
const auth = (req, res, next) => {
  req.user = { _id: new mongoose.Types.ObjectId('000000000000000000000001') };
  next();
};

router.use(auth);

// Robot
router.post('/robot', registraRobot);
router.get('/robot', getRobot);
router.get('/robot/:id', getRobotDetails);
router.put('/robot/:id', updateRobot);
router.delete('/robot/:id', deleteRobot);

// Droni
router.post('/drone', registraDrone);
router.get('/droni', getDroni);
router.get('/drone/:id', getDroneDetails);

// Missioni
router.post('/missione/avvia', avviaMissione);
router.post('/missione/completa', completaMissione);

// Pagamenti
router.post('/missione/paga', pagaMissione);

// Statistiche
router.get('/stats/:tipo/:id', getStats);

module.exports = router;
