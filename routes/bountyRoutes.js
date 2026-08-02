const express = require('express');
const router = express.Router();
const bountyController = require('../controllers/bountyController');
const { authenticate } = require('../middleware/auth');

// Route pubbliche
router.get('/', bountyController.getAll);
router.get('/stats', bountyController.getStats);

// Route protette
router.post('/create', authenticate, bountyController.create);
router.patch('/:id/assign', authenticate, bountyController.assign);
router.patch('/:id/complete', authenticate, bountyController.complete);

module.exports = router;
