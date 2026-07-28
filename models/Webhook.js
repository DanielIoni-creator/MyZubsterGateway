// models/Webhook.js
const mongoose = require('mongoose');
const crypto = require('crypto');

const webhookSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
  secret: { type: String, required: true, default: () => crypto.randomBytes(24).toString('hex') },
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
      'order.refunded',
    ],
  }],
  active: { type: Boolean, default: true },
  retryConfig: {
    maxAttempts: { type: Number, default: 5 },
    initialDelay: { type: Number, default: 1000 },
    maxDelay: { type: Number, default: 60000 },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

webhookSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Webhook', webhookSchema);
