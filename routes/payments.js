const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// Get payment status
router.get('/status/:orderId', authenticate, paymentController.getPaymentStatus);

// Process payment
router.post('/process', authenticate, paymentController.processPayment);

// Get payment history
router.get('/history', authenticate, paymentController.getPaymentHistory);

// Generate Monero payment address
router.post('/generate-address', authenticate, paymentController.generatePaymentAddress);

// Verify payment
router.post('/verify', authenticate, paymentController.verifyPayment);

// Webhook for payment confirmation (no auth required)
router.post('/webhook', paymentController.webhookHandler);

module.exports = router;
