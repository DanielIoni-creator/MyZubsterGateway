// models/Webhook.js
const mongoose = require('mongoose');

const WebhookSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true
  },
  secret: {
    type: String,
    required: true
  },
  events: [{
    type: String,
    enum: [
      'order.created',
      'order.awaiting-payment',
      'order.payment-received',
      'order.payment-confirmed',
      'order.processing',
      'order.completed',
      'order.cancelled',
      'order.refunded'
    ],
    required: true
  }],
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Webhook', WebhookSchema);
