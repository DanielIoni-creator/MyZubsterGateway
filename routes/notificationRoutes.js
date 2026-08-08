const express = require('express');
const router = express.Router();
const {
  sendWelcomeEmail,
  sendTokenPurchaseEmail,
  sendBountyCompletedEmail
} = require('../controllers/notificationController');

// POST /api/notifications/welcome/:userId
router.post('/welcome/:userId', sendWelcomeEmail);

// POST /api/notifications/token-purchase
router.post('/token-purchase', sendTokenPurchaseEmail);

// POST /api/notifications/bounty-completed
router.post('/bounty-completed', sendBountyCompletedEmail);

module.exports = router;
