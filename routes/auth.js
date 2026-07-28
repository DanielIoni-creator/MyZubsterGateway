const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Solo le route che esistono nel controller
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
