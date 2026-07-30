const express = require('express');
const router = express.Router();
const escrowService = require('../services/escrowService');

router.post('/orders', async (req, res) => {
  try {
    const { buyer, seller, amount, currency, marketplaceOrderId, metadata } = req.body;
    if (!buyer || !seller || !amount) return res.status(400).json({ error: 'buyer, seller, and amount are required' });
    const order = await escrowService.createOrder({ buyer, seller, amount, currency, marketplaceOrderId, metadata });
    res.status(201).json({ success: true, order });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/orders/:orderId', async (req, res) => {
  try {
    const order = await escrowService.getOrder(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ success: true, order });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.get('/orders', async (req, res) => {
  try {
    const { buyer, seller, status, limit, offset } = req.query;
    const orders = await escrowService.listOrders({ buyer, seller, status, limit: parseInt(limit)||20, offset: parseInt(offset)||0 });
    res.json({ success: true, orders, count: orders.length });
  } catch (error) { res.status(500).json({ error: error.message }); }
});
router.put('/orders/:orderId/fund', async (req, res) => {
  try {
    const order = await escrowService.markFunded(req.params.orderId, req.body.multisigAddress);
    res.json({ success: true, order });
  } catch (error) { res.status(400).json({ error: error.message }); }
});
router.put('/orders/:orderId/complete', async (req, res) => {
  try {
    const order = await escrowService.markCompleted(req.params.orderId);
    res.json({ success: true, order });
  } catch (error) { res.status(400).json({ error: error.message }); }
});
router.put('/orders/:orderId/dispute', async (req, res) => {
  try {
    const order = await escrowService.markDisputed(req.params.orderId, req.body.reason || 'No reason');
    res.json({ success: true, order });
  } catch (error) { res.status(400).json({ error: error.message }); }
});
router.put('/orders/:orderId/refund', async (req, res) => {
  try {
    const order = await escrowService.refundOrder(req.params.orderId, req.body.reason || 'No reason');
    res.json({ success: true, order });
  } catch (error) { res.status(400).json({ error: error.message }); }
});
module.exports = router;
