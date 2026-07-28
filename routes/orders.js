const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const webhookService = require('../services/webhook.service');

router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().populate('user');
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    await webhookService.triggerEvent('order.created', webhookService.buildOrderPayload(order, 'order.created'));
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id/status', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, paymentStatus: req.body.paymentStatus },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const event = `order.${order.status}`;
    await webhookService.triggerEvent('order.updated', webhookService.buildOrderPayload(order, 'order.updated'));
    await webhookService.triggerEvent(event, webhookService.buildOrderPayload(order, event));
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
