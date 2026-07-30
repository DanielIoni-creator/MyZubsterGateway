const mongoose = require('mongoose');

const AttemptSchema = new mongoose.Schema({
  attemptNumber: { type: Number, required: true },
  statusCode: { type: Number, default: null },
  responseBody: { type: String, default: null },
  error: { type: String, default: null },
  durationMs: { type: Number, default: null },
  attemptedAt: { type: Date, default: Date.now },
}, { _id: false });

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
  status: {
    type: String,
    enum: ['pending', 'delivering', 'delivered', 'failed', 'permanently_failed'],
    default: 'pending',
    index: true,
  },
  attempts: {
    type: [AttemptSchema],
    default: [],
  },
  nextRetryAt: {
    type: Date,
    default: null,
    index: true,
  },
  maxRetries: {
    type: Number,
    default: 5,
  },
  signatureHeader: {
    type: String,
    default: null,
  },
  deliveredAt: { type: Date, default: null },
  permanentlyFailedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

WebhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });
WebhookDeliverySchema.index({ subscriptionId: 1, createdAt: -1 });

module.exports = mongoose.model('WebhookDelivery', WebhookDeliverySchema);
