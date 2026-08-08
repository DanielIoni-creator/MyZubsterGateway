const express = require('express');
const router = express.Router();
const plantController = require('../controllers/plantController');

router.post('/register', plantController.registerPlant);
router.get('/', plantController.getPlants);

module.exports = router;
