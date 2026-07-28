const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');
const { authenticate } = require('../middleware/auth');

// Route pubbliche (NFC lookup - non richiede autenticazione)
router.get('/nfc/:nfcId', petController.getPetByNfc);

// Route protette (richiedono autenticazione)
router.post('/register',  petController.registerPet);
router.get('/',  petController.getPets);
router.get('/:id',  petController.getPetById);
router.put('/:id',  petController.updatePet);
router.delete('/:id',  petController.deletePet);

module.exports = router;
