// routes/orders.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

// Create a new order (requires authentication)
router.post('/', authenticate, orderController.createOrder);

// Get all orders for the authenticated user
router.get('/', authenticate, orderController.getUserOrders);

// Get a specific order by ID
router.get('/:id', authenticate, orderController.getOrderById);

// Update order status
router.patch('/:id/status', authenticate, orderController.updateOrderStatus);

// Confirm payment for an order
router.post('/:id/confirm-payment', authenticate, orderController.confirmPayment);

// Complete an order
router.post('/:id/complete', authenticate, orderController.completeOrder);

// Cancel an order
router.delete('/:id', authenticate, orderController.cancelOrder);

module.exports = router;
