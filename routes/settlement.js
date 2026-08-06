const express = require('express');
const { SettlementSimulator } = require('../services/settlementSimulator');

const router = express.Router();
const simulator = new SettlementSimulator({ contractAddress: process.env.SETTLEMENT_CONTRACT_ADDRESS });

function action(handler) {
  return async (req, res) => {
    try {
      const data = await handler(req);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  };
}

router.post('/banks', action(req => simulator.registerBank(req.body)));
router.post('/issue', action(req => simulator.issue(req.body)));
router.post('/redeem', action(req => simulator.redeem(req.body)));
router.post('/transfers', action(req => simulator.createTransfer(req.body)));
router.post('/transfers/:transferId/settle', action(req => simulator.settle(req.params.transferId)));
router.get('/report', action(() => simulator.report()));

router.simulator = simulator;

module.exports = router;
