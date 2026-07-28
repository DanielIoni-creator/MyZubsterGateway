const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

router.post('/', authenticate, orderController.createOrder);
router.get('/', authenticate, orderController.getUserOrders);
router.get('/:id', authenticate, orderController.getOrderById);
router.patch('/:id/status', authenticate, orderController.updateOrderStatus);
router.post('/:id/confirm-payment', authenticate, orderController.confirmPayment);
router.post('/:id/complete', authenticate, orderController.completeOrder);
router.delete('/:id', authenticate, orderController.cancelOrder);

module.exports = router;
