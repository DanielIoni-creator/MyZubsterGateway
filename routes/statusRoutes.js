const express = require('express');
const router = express.Router();
const { getSystemStatus } = require('../controllers/statusController');

// GET /api/status - Ottieni lo stato completo del sistema
router.get('/', getSystemStatus);

module.exports = router;
