const express = require('express');
const { HydrogenRefuelingService } = require('../services/hydrogenRefuelingService');

const router = express.Router();
const service = new HydrogenRefuelingService();
const respond = (res, action) => {
  try { return res.json({ success: true, data: action() }); }
  catch (error) { return res.status(/not found/i.test(error.message) ? 404 : 400).json({ success: false, error: error.message }); }
};

router.post('/wallets/:walletId/balance', (req, res) => respond(res, () => service.setWalletBalance(req.params.walletId, req.body?.myz)));
router.post('/stations', (req, res) => respond(res.status(201), () => service.registerStation(req.body)));
router.patch('/stations/:stationId', (req, res) => respond(res, () => service.setStationStatus(req.params.stationId, req.body)));
router.get('/monitoring', (_req, res) => respond(res, () => service.monitoring()));
router.post('/refuels', (req, res) => respond(res.status(201), () => service.beginRefuel(req.body)));
router.post('/refuels/:refuelId/progress', (req, res) => respond(res, () => service.recordProgress(req.params.refuelId, req.body)));
router.post('/refuels/:refuelId/cancel', (req, res) => respond(res, () => service.cancelRefuel(req.params.refuelId)));
router.get('/history', (req, res) => respond(res, () => service.history(req.query)));

module.exports = router;
module.exports.service = service;
