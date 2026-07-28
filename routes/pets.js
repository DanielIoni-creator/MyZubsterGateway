const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');

// PUBBLICO - NFC lookup (NON richiede autenticazione)
router.get('/nfc/:nfcId', petController.getPetByNfc);

// PROTETTE - richiedono autenticazione
const { authenticate } = require('../middleware/auth');
router.post('/register', authenticate, petController.registerPet);
router.get('/', authenticate, petController.getPets);
router.get('/:id', authenticate, petController.getPetById);
router.put('/:id', authenticate, petController.updatePet);
router.delete('/:id', authenticate, petController.deletePet);

module.exports = router;
