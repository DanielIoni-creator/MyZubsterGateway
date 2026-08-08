const express = require('express');
const router = express.Router();
const {
  creaStazione,
  getStazioni,
  getStazioneVicina,
  updatePrezzi
} = require('../controllers/stazioneController');

router.post('/', creaStazione);
router.get('/', getStazioni);
router.get('/vicine', getStazioneVicina);
router.put('/:id/prezzi', updatePrezzi);

module.exports = router;
