const mongoose = require('mongoose');
const crypto = require('crypto');

const RetryConfigSchema = new mongoose.Schema({
  maxAttempts: { type: Number, default: 5, min: 1, max: 20 },
  baseDelayMs: { type: Number, default: 1000, min: 100 },
  maxDelayMs: { type: Number, default: 60000, min: 1000 },
}, { _id: false });

const WebhookSubscriptionSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: (v) => /^https?:\/\/.+/.test(v),
      message: 'URL must start with http:// or https://',
    },
  },
  secret: {
    type: String,
    default: () => crypto.randomBytes(32).toString('hex'),
  },
  events: {
    type: [String],
    required: true,
    validate: {
      validator: (v) => v.length > 0,
      message: 'At least one event type is required',
    },
  },
  description: {
    type: String,
    default: '',
    maxlength: 500,
  },
  active: {
    type: Boolean,
    default: true,
    index: true,
  },
  retryConfig: {
    type: RetryConfigSchema,
    default: () => ({}),
  },
  headers: {
    type: Map,
    of: String,
    default: () => ({}),
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({}),
  },
  lastTriggeredAt: { type: Date, default: null },
  lastSuccessAt: { type: Date, default: null },
  lastFailureAt: { type: Date, default: null },
  consecutiveFailures: { type: Number, default: 0 },
}, {
  timestamps: true,
});

WebhookSubscriptionSchema.index({ events: 1, active: 1 });
WebhookSubscriptionSchema.index({ createdAt: -1 });

WebhookSubscriptionSchema.methods.generateSecret = function () {
  this.secret = crypto.randomBytes(32).toString('hex');
  return this.secret;
};

module.exports = mongoose.model('WebhookSubscription', WebhookSubscriptionSchema);
