const express = require('express');
const router = express.Router();

<<<<<<< HEAD
router.get('/', (req, res) => {
  res.json({ message: 'orders route' });
=======
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().populate('user');
    res.json({ success: true, message: req.t('orders.listed'), data: orders });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
>>>>>>> pr52-pgp
});

module.exports = router;
