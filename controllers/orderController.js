const Order = require('../models/Order');
const emailService = require('../services/emailService');
const webhookService = require('../services/webhook.service');

async function triggerOrderWebhooks(order, events) {
  for (const event of events) {
    await webhookService.triggerEvent(event, webhookService.buildOrderPayload(order, event));
  }
}

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const { userName, userEmail, items, total } = req.body;

    if (!userName || !userEmail || !items || !total) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const order = new Order({
      user: req.user.id,
      userName,
      userEmail,
      items,
      total,
      status: 'pending'
    });

    await order.save();
    await triggerOrderWebhooks(order, ['order.created']);

    // Invia email di conferma
    await emailService.sendOrderConfirmation(order, userEmail);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all orders for authenticated user
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id });
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    res.json({ success: true, order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    order.status = status;
    await order.save();
    await triggerOrderWebhooks(order, ['order.updated', `order.${order.status}`]);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Confirm payment
exports.confirmPayment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    order.status = 'paid';
    await order.save();
    await triggerOrderWebhooks(order, ['order.updated', 'order.paid']);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Complete order
exports.completeOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    order.status = 'completed';
    await order.save();
    await triggerOrderWebhooks(order, ['order.updated', 'order.completed']);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Complete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    order.status = 'cancelled';
    await order.save();
    await triggerOrderWebhooks(order, ['order.updated', 'order.cancelled']);
    res.json({ success: true, order });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
