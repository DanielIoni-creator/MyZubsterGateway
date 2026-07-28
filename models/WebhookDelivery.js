const mongoose = require('mongoose');

const webhookDeliverySchema = new mongoose.Schema({
  webhook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Webhook',
    required: true,
    index: true
  },
  event: {
    type: String,
    required: true,
    index: true
  },
  payload: {
    type: Object,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'pending',
    index: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  responseStatus: {
    type: Number,
    default: null
  },
  responseBody: {
    type: String,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  nextRetryAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

webhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });
webhookDeliverySchema.index({ createdAt: -1 });

module.exports = mongoose.model('WebhookDelivery', webhookDeliverySchema);
