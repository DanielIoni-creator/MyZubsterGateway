const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');

router.post('/create', async (req, res) => {
  try {
    const { orderId, amount, currency } = req.body;
    const payment = await paymentService.createPayment(orderId, amount, currency);
    res.json({ success: true, message: req.t('payments.created'), data: payment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/status/:paymentId', async (req, res) => {
  try {
    const payment = await paymentService.getPaymentStatus(req.params.paymentId);
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(404).json({ success: false, error: req.t('payments.notFound') });
  }
});

module.exports = router;
