const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

console.log('📋 Order Controller functions:', Object.keys(orderController));
console.log('📋 Authenticate function:', typeof authenticate);

// Create a new order
router.post('/', authenticate, orderController.createOrder);

// Get all orders
router.get('/', authenticate, orderController.getUserOrders);

// Get order by ID
router.get('/:id', authenticate, orderController.getOrderById);

// Update order status
router.patch('/:id/status', authenticate, orderController.updateOrderStatus);

// Confirm payment
router.post('/:id/confirm-payment', authenticate, orderController.confirmPayment);

// Complete order
router.post('/:id/complete', authenticate, orderController.completeOrder);

// Cancel order
router.delete('/:id', authenticate, orderController.cancelOrder);

module.exports = router;
