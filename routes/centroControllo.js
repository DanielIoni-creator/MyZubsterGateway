const express = require('express');
const router = express.Router();
const {
  creaCentro,
  getCentri,
  getCentro,
  updatePrezzi
} = require('../controllers/centroControlloController');

router.post('/', creaCentro);
router.get('/', getCentri);
router.get('/:id', getCentro);
router.put('/:id/prezzi', updatePrezzi);

module.exports = router;
