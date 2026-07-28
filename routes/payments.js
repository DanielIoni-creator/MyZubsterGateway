const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

router.get('/status/:orderId', authenticate, paymentController.getPaymentStatus);
router.post('/process', authenticate, paymentController.processPayment);
router.get('/history', authenticate, paymentController.getPaymentHistory);
router.post('/generate-address', authenticate, paymentController.generatePaymentAddress);
router.post('/verify', authenticate, paymentController.verifyPayment);
router.post('/webhook', paymentController.webhookHandler);

module.exports = router;
