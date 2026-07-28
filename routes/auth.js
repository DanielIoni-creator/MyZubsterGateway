// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Routes pubbliche
router.post('/register', authController.register);
router.post('/login', authController.login);

// Routes protette
router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);

module.exports = router;
