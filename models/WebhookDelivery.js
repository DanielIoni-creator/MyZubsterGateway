// models/WebhookDelivery.js
const mongoose = require('mongoose');

const webhookDeliverySchema = new mongoose.Schema({
  webhook: { type: mongoose.Schema.Types.ObjectId, ref: 'Webhook', required: true },
  event: { type: String, required: true },
  payload: { type: Object, default: {} },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'dead'],
    default: 'pending',
  },
  attempts: { type: Number, default: 0 },
  lastError: { type: String },
  deliveredAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WebhookDelivery', webhookDeliverySchema);
