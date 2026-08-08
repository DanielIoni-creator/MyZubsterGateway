const express = require('express');
const router = express.Router();
const {
  registraAuto,
  getAuto,
  getAutoDetails,
  updateAuto,
  deleteAuto,
  rifornisci,
  autoRefill,
  getStats
} = require('../controllers/autoController');
const { auth } = require('../middleware/auth');

router.post('/registra', auth, registraAuto);
router.get('/', auth, getAuto);
router.get('/:id', auth, getAutoDetails);
router.put('/:id', auth, updateAuto);
router.delete('/:id', auth, deleteAuto);
router.post('/rifornisci', auth, rifornisci);
router.post('/:id/auto-refill', auth, autoRefill);
router.get('/:id/stats', auth, getStats);

module.exports = router;
