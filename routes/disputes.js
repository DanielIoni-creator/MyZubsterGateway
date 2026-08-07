const express = require('express');
const mongoose = require('mongoose');
const { DisputeService, MemoryDisputeStore, MongoDisputeStore } = require('../services/disputeService');

const router = express.Router();

function buildStore() {
  if (mongoose.connection?.readyState === 1) {
    return new MongoDisputeStore(require('../models/Dispute'));
  }
  return new MemoryDisputeStore();
}

const service = new DisputeService({ store: buildStore() });

const fail = (res, error) => {
  const notFound = error.message === 'Dispute not found';
  const conflict = /already|not open|is closed|Cannot assign/.test(error.message);
  return res.status(notFound ? 404 : conflict ? 409 : 400).json({ success: false, error: error.message });
};

router.post('/', async (req, res) => {
  try { return res.status(201).json({ success: true, data: await service.open(req.body) }); }
  catch (error) { return fail(res, error); }
});

router.post('/:disputeId/evidence', async (req, res) => {
  try { return res.json({ success: true, data: await service.submitEvidence({ disputeId: req.params.disputeId, ...req.body }) }); }
  catch (error) { return fail(res, error); }
});

router.post('/:disputeId/mediators', async (req, res) => {
  try { return res.json({ success: true, data: await service.assignMediators({ disputeId: req.params.disputeId, mediators: req.body?.mediators }) }); }
  catch (error) { return fail(res, error); }
});

router.post('/:disputeId/votes', async (req, res) => {
  try { return res.json({ success: true, data: await service.vote({ disputeId: req.params.disputeId, ...req.body }) }); }
  catch (error) { return fail(res, error); }
});

// Idempotent sweep: closes evidence windows, opens votes, resolves timeouts.
router.post('/tick', async (_req, res) => {
  try { return res.json({ success: true, data: await service.tick() }); }
  catch (error) { return fail(res, error); }
});

router.get('/summary', async (_req, res) => {
  try { return res.json({ success: true, data: await service.summary() }); }
  catch (error) { return fail(res, error); }
});

router.get('/job/:jobId', async (req, res) => {
  try { return res.json({ success: true, data: await service.listByJob(req.params.jobId) }); }
  catch (error) { return fail(res, error); }
});

router.get('/:disputeId', async (req, res) => {
  try { return res.json({ success: true, data: await service.get(req.params.disputeId) }); }
  catch (error) { return fail(res, error); }
});

module.exports = router;
module.exports.service = service;
