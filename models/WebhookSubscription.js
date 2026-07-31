const mongoose = require('mongoose');

const WebhookSubscriptionSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid webhook URL',
    },
  },
  secret: {
    type: String,
    required: true,
    default: () => require('crypto').randomBytes(32).toString('hex'),
  },
  events: {
    type: [String],
    required: true,
    validate: {
      validator: function (v) {
        return v && v.length > 0;
      },
      message: 'At least one event must be subscribed',
    },
  },
  active: {
    type: Boolean,
    default: true,
  },
  retryConfig: {
    maxAttempts: { type: Number, default: 5, min: 1, max: 20 },
    initialDelayMs: { type: Number, default: 5000, min: 1000 },
    maxDelayMs: { type: Number, default: 60000, min: 5000 },
  },
  description: { type: String, default: '' },
  metadata: {
    createdBy: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  lastTriggeredAt: { type: Date, default: null },
  failureCount: { type: Number, default: 0 },
}, { timestamps: true });

WebhookSubscriptionSchema.index({ url: 1, active: 1 });
WebhookSubscriptionSchema.index({ events: 1, active: 1 });

module.exports = mongoose.model('WebhookSubscription', WebhookSubscriptionSchema);
