const mongoose = require('mongoose');

const WebhookDeliverySchema = new mongoose.Schema({
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebhookSubscription',
    required: true,
    index: true,
  },
  event: {
    type: String,
    required: true,
    index: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  attempts: [{
    timestamp: { type: Date, default: Date.now },
    statusCode: { type: Number, default: null },
    responseBody: { type: String, default: null },
    error: { type: String, default: null },
    durationMs: { type: Number, default: null },
  }],
  status: {
    type: String,
    enum: ['pending', 'delivered', 'failed', 'dead', 'pending_retry'],
    default: 'pending',
    index: true,
  },
  nextRetryAt: { type: Date, default: null, index: true },
  createdAt: { type: Date, default: Date.now, index: true },
  completedAt: { type: Date, default: null },
});

WebhookDeliverySchema.index({ subscriptionId: 1, createdAt: -1 });
WebhookDeliverySchema.index({ event: 1, status: 1, createdAt: -1 });
WebhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });

module.exports = mongoose.model('WebhookDelivery', WebhookDeliverySchema);
