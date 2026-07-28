const Order = require('../models/Order');

exports.getPaymentStatus = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({
      success: true,
      status: order.status,
      payment: order.moneroTxId ? 'confirmed' : 'pending'
    });
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.processPayment = async (req, res) => {
  try {
    const { orderId, amount, moneroAddress } = req.body;
    // TODO: Integrate with Monero wallet
    res.json({
      success: true,
      message: 'Payment processed',
      orderId,
      amount
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, payments: orders });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.generatePaymentAddress = async (req, res) => {
  try {
    // TODO: Generate Monero subaddress
    res.json({
      success: true,
      address: '4A2M4vB...',
      qrCode: 'data:image/png;base64,...'
    });
  } catch (error) {
    console.error('Generate address error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, txId } = req.body;
    // TODO: Verify Monero transaction
    res.json({
      success: true,
      verified: true,
      txId
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.webhookHandler = async (req, res) => {
  try {
    // TODO: Handle Monero payment webhook
    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
