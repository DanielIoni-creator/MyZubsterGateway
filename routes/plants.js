const express = require('express');
const router = express.Router();
const plantController = require('../controllers/plantController');
const { authenticate } = require('../middleware/auth');

router.post('/register', authenticate, plantController.registerPlant);
router.get('/', plantController.getPlants);
router.get('/:id', plantController.getPlantById);

module.exports = router;
