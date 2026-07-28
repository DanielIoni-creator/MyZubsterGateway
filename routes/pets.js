const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const { authenticate } = require('../middleware/auth');

// Route pubbliche (NFC lookup - SENZA autenticazione)
router.get('/nfc/:nfcId', petController.getPetByNfc);

// Route protette
router.post('/register', authenticate, petController.registerPet);
router.get('/', authenticate, petController.getPets);
router.get('/:id', authenticate, petController.getPetById);
router.put('/:id', authenticate, petController.updatePet);
router.delete('/:id', authenticate, petController.deletePet);

module.exports = router;
