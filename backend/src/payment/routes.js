const express = require('express');

function createPaymentRouter(paymentService, config) {
  const router = express.Router();

  router.post('/create', async (req, res) => {
    try {
      const payment = await paymentService.createPayment(req.body || {});
      res.status(201).json(payment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get('/status/:paymentId', async (req, res) => {
    try {
      const payment = await paymentService.getStatus(req.params.paymentId);
      if (!payment) return res.status(404).json({ error: 'payment not found' });
      res.json(payment);
    } catch (error) {
      res.status(502).json({ error: error.message });
    }
  });

  router.post('/webhook', (req, res) => {
    if (config.webhookSecret) {
      const received = req.get('x-payment-secret') || req.get('x-moneropay-secret');
      if (received !== config.webhookSecret) {
        return res.status(401).json({ error: 'invalid webhook secret' });
      }
    }

    const payment = paymentService.applyWebhook(req.body || {});
    if (!payment) return res.status(404).json({ error: 'payment not found' });
    res.json(payment);
  });

  return router;
}

module.exports = { createPaymentRouter };
