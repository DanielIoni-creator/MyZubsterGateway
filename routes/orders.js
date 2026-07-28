const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().populate('user');
    res.json({ success: true, message: req.t('orders.listed'), data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
