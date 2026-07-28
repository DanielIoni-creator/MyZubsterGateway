const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

// Verifica che tutte le funzioni esistano prima di usarle
console.log('📋 Order Controller functions:', Object.keys(orderController));

// Create a new order
router.post('/', authenticate, (req, res, next) => {
  if (typeof orderController.createOrder !== 'function') {
    return res.status(500).json({ error: 'createOrder function not found' });
  }
  next();
}, orderController.createOrder);

// Get all orders
router.get('/', authenticate, (req, res, next) => {
  if (typeof orderController.getUserOrders !== 'function') {
    return res.status(500).json({ error: 'getUserOrders function not found' });
  }
  next();
}, orderController.getUserOrders);

// Get order by ID
router.get('/:id', authenticate, (req, res, next) => {
  if (typeof orderController.getOrderById !== 'function') {
    return res.status(500).json({ error: 'getOrderById function not found' });
  }
  next();
}, orderController.getOrderById);

// Update order status
router.patch('/:id/status', authenticate, (req, res, next) => {
  if (typeof orderController.updateOrderStatus !== 'function') {
    return res.status(500).json({ error: 'updateOrderStatus function not found' });
  }
  next();
}, orderController.updateOrderStatus);

// Confirm payment
router.post('/:id/confirm-payment', authenticate, (req, res, next) => {
  if (typeof orderController.confirmPayment !== 'function') {
    return res.status(500).json({ error: 'confirmPayment function not found' });
  }
  next();
}, orderController.confirmPayment);

// Complete order
router.post('/:id/complete', authenticate, (req, res, next) => {
  if (typeof orderController.completeOrder !== 'function') {
    return res.status(500).json({ error: 'completeOrder function not found' });
  }
  next();
}, orderController.completeOrder);

// Cancel order
router.delete('/:id', authenticate, (req, res, next) => {
  if (typeof orderController.cancelOrder !== 'function') {
    return res.status(500).json({ error: 'cancelOrder function not found' });
  }
  next();
}, orderController.cancelOrder);

module.exports = router;
