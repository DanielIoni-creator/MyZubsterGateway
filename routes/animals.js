const express = require('express');
const router = express.Router();
const animalController = require('../controllers/animalController');

router.post('/register', animalController.registerAnimal);
router.get('/', animalController.getAnimals);
router.get('/:id', animalController.getAnimalById);
router.put('/:id', animalController.updateAnimal);
router.delete('/:id', animalController.deleteAnimal);

module.exports = router;
