const express = require('express');
const mongoose = require('mongoose');
const { PaymentService, MemoryPaymentStore, MongoPaymentStore, publicView } = require('../services/paymentService');

const router = express.Router();

// Mongo when the gateway has a live connection, memory otherwise, so the API
// stays usable in local/dev runs without a database.
function buildStore() {
  if (mongoose.connection?.readyState === 1) {
    return new MongoPaymentStore(require('../models/Payment'));
  }
  return new MemoryPaymentStore();
}

const service = new PaymentService({ store: buildStore() });

router.post('/', async (req, res) => {
  try {
    const payment = await service.createPayment({ ...req.body, idempotencyKey: req.get('idempotency-key') || req.body.idempotencyKey || null });
    return res.status(201).json({ success: true, data: publicView(payment, { includeSecret: true }) });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const page = await service.list(req.query);
    return res.json({ success: true, ...page, items: page.items.map((item) => publicView(item)) });
  } catch (error) {
    return res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    return res.json({ success: true, data: publicView(await service.requirePayment(req.params.id)) });
  } catch (error) {
    return res.status(404).json({ success: false, error: error.message });
  }
});

router.post('/:id/status', async (req, res) => {
  const { status, txId, confirmations, reason } = req.body || {};
  if (!status) return res.status(400).json({ success: false, error: 'status is required' });
  try {
    const payment = await service.transition(req.params.id, status, { txId, confirmations, reason });
    return res.json({ success: true, data: publicView(payment) });
  } catch (error) {
    const notFound = error.message === 'Payment not found';
    return res.status(notFound ? 404 : 409).json({ success: false, error: error.message });
  }
});

router.get('/:id/deliveries', async (req, res) => {
  try {
    const payment = await service.requirePayment(req.params.id);
    return res.json({ success: true, data: payment.deliveries });
  } catch (error) {
    return res.status(404).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.service = service;
