const express = require('express');
const { Gl1BridgeService, MemoryTransferStore, createGl1Client } = require('../services/gl1BridgeService');
const { Gl1Simulator, MyzLedgerSimulator } = require('../services/gl1Simulator');

const router = express.Router();
const simulated = process.env.GL1_SIMULATOR === 'true' || !process.env.GL1_API_URL;
const gl1 = simulated ? new Gl1Simulator() : createGl1Client({ baseUrl: process.env.GL1_API_URL, token: process.env.GL1_API_TOKEN });
const myzLedger = new MyzLedgerSimulator();
const store = new MemoryTransferStore();
const service = new Gl1BridgeService({ gl1, myzLedger, store });

router.post('/quotes', async (req, res) => {
  try { return res.json({ success: true, simulated, data: await service.quote(req.body) }); }
  catch (error) { return res.status(400).json({ success: false, error: error.message }); }
});
router.post('/transfers', async (req, res) => {
  try { return res.status(201).json({ success: true, simulated, data: await service.createTransfer(req.body) }); }
  catch (error) { return res.status(502).json({ success: false, error: error.message }); }
});
router.get('/transfers', async (_req, res) => res.json({ success: true, simulated, data: await store.list() }));
router.get('/transfers/:id', async (req, res) => {
  try { return res.json({ success: true, simulated, data: await service.requireTransfer(req.params.id) }); }
  catch (error) { return res.status(404).json({ success: false, error: error.message }); }
});

module.exports = router;
module.exports.service = service;
