const express = require('express');
const mongoose = require('mongoose');
const {
  PaymentVerificationService,
  MemoryVerificationStore,
  MongoVerificationStore,
  SimulatedChain,
  createMoneroChain,
} = require('../services/paymentVerificationService');

const router = express.Router();

function buildStore() {
  if (mongoose.connection?.readyState === 1) {
    return new MongoVerificationStore(require('../models/VerificationRecord'));
  }
  return new MemoryVerificationStore();
}

// A real wallet when one is configured, a simulator otherwise, so the endpoints
// stay usable in local runs without a Monero daemon.
const simulated = !process.env.XMR_WALLET_URL;
const chain = simulated ? new SimulatedChain() : createMoneroChain();
const service = new PaymentVerificationService({ chain, store: buildStore() });

const fail = (res, error) => {
  const notFound = error.message === 'Verification record not found';
  return res.status(notFound ? 404 : 400).json({ success: false, error: error.message });
};

router.get('/report', async (_req, res) => {
  try { return res.json({ success: true, simulated, data: await service.report() }); }
  catch (error) { return fail(res, error); }
});

router.get('/anomalies', async (_req, res) => {
  try { return res.json({ success: true, simulated, data: await service.anomalies() }); }
  catch (error) { return fail(res, error); }
});

router.post('/verify', async (req, res) => {
  try { return res.json({ success: true, simulated, data: await service.verify(req.body) }); }
  catch (error) { return fail(res, error); }
});

router.post('/sweep', async (req, res) => {
  const subjects = Array.isArray(req.body?.subjects) ? req.body.subjects : null;
  if (!subjects) return res.status(400).json({ success: false, error: 'subjects must be an array' });
  try { return res.json({ success: true, simulated, data: await service.sweep(subjects) }); }
  catch (error) { return fail(res, error); }
});

router.get('/:paymentId', async (req, res) => {
  try { return res.json({ success: true, simulated, data: await service.get(req.params.paymentId) }); }
  catch (error) { return fail(res, error); }
});

module.exports = router;
module.exports.service = service;
