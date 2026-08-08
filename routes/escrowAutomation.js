const express = require('express');
const mongoose = require('mongoose');
const {
  EscrowAutomationService,
  MemoryEscrowStore,
  MongoEscrowStore,
  createWalletAdapter,
} = require('../services/escrowAutomationService');

const router = express.Router();

function buildStore() {
  if (mongoose.connection?.readyState === 1) {
    return new MongoEscrowStore(require('../models/EscrowJob'));
  }
  return new MemoryEscrowStore();
}

const service = new EscrowAutomationService({ wallet: createWalletAdapter(), store: buildStore() });

const fail = (res, error) => {
  const notFound = error.message === 'Escrow not found';
  const conflict = /Cannot deliver|already|Only a disputed/.test(error.message);
  return res.status(notFound ? 404 : conflict ? 409 : 400).json({ success: false, error: error.message });
};

router.post('/', async (req, res) => {
  try { return res.status(201).json({ success: true, data: await service.open(req.body) }); }
  catch (error) { return fail(res, error); }
});

router.post('/:jobId/delivered', async (req, res) => {
  try { return res.json({ success: true, data: await service.markDelivered({ jobId: req.params.jobId, proof: req.body?.proof ?? null }) }); }
  catch (error) { return fail(res, error); }
});

router.post('/:jobId/dispute', async (req, res) => {
  try { return res.json({ success: true, data: await service.dispute({ jobId: req.params.jobId, reason: req.body?.reason }) }); }
  catch (error) { return fail(res, error); }
});

router.post('/:jobId/resolve', async (req, res) => {
  try { return res.json({ success: true, data: await service.resolve({ jobId: req.params.jobId, outcome: req.body?.outcome, note: req.body?.note ?? null }) }); }
  catch (error) { return fail(res, error); }
});

// Idempotent sweep. Point a scheduler at this; running it twice is harmless.
router.post('/tick', async (_req, res) => {
  try { return res.json({ success: true, data: await service.tick() }); }
  catch (error) { return fail(res, error); }
});

router.get('/summary', async (_req, res) => {
  try { return res.json({ success: true, data: await service.summary() }); }
  catch (error) { return fail(res, error); }
});

router.get('/:jobId', async (req, res) => {
  try { return res.json({ success: true, data: await service.get(req.params.jobId) }); }
  catch (error) { return fail(res, error); }
});

router.get('/:jobId/log', async (req, res) => {
  try { return res.json({ success: true, data: await service.auditLog(req.params.jobId) }); }
  catch (error) { return fail(res, error); }
});

module.exports = router;
module.exports.service = service;
