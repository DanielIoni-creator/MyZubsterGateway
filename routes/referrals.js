const express = require('express');
const { createReferralService, ReferralError } = require('../services/referralService');

function createReferralRouter(service = createReferralService()) {
  const router = express.Router();

  router.post('/shops', async (req, res) => {
    try {
      const data = await service.registerShop(req.body || {});
      res.status(201).json({ success: true, data });
    } catch (error) {
      handleError(error, res);
    }
  });

  router.post('/track', async (req, res) => {
    try {
      const data = await service.trackReferral(req.body || {});
      res.status(201).json({ success: true, data });
    } catch (error) {
      handleError(error, res);
    }
  });

  router.get('/shops/:shopId', async (req, res) => {
    try {
      const data = await service.getDashboard(req.params.shopId);
      res.json({ success: true, data });
    } catch (error) {
      handleError(error, res);
    }
  });

  router.post('/shops/:shopId/credits/apply', async (req, res) => {
    try {
      const data = await service.applyCredit({
        shopId: req.params.shopId,
        walletAddress: req.body?.walletAddress,
        amountMYZ: req.body?.amountMYZ
      });
      res.json({ success: true, data });
    } catch (error) {
      handleError(error, res);
    }
  });

  return router;
}

function handleError(error, res) {
  const statusCode = error instanceof ReferralError ? error.statusCode : 500;
  res.status(statusCode).json({ success: false, error: error.message });
}

module.exports = createReferralRouter();
module.exports.createReferralRouter = createReferralRouter;
