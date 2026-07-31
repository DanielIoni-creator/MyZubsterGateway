// models/Webhook.js
// Mongoose model for registered webhook subscriptions.
// Created for issue #42: Implement Webhook System for Order Events.
'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');

const WebhookSchema = new mongoose.Schema(
  {
    // Logical event names this webhook subscribes to (e.g. "order.created",
    // "order.paid", "order.cancelled"). Stored as lowercase strings.
    events: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'Webhook must subscribe to at least one event',
      },
    },
    // Destination URL that receives the POSTed payloads.
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => /^https?:\/\/\S+/i.test(v),
        message: 'Webhook url must be a valid http(s) URL',
      },
    },
    // Per-webhook HMAC-SHA256 signing secret. If absent on creation a
    // cryptographically strong random one is generated and persisted; this
    // value is what receivers use to verify the X-MyZubster-Signature header.
    secret: {
      type: String,
      required: true,
      default: () => crypto.randomBytes(32).toString('hex'),
    },
    // Optional friendly description for admin inspection.
    description: { type: String, default: '', trim: true },
    // Soft-disable instead of deleting to retain delivery history.
    active: { type: Boolean, default: true, index: true },
    // Retry configuration with sensible defaults sourced from the issue spec.
    retryConfig: {
      maxAttempts: { type: Number, default: 5, min: 1 },
      // Initial delay in ms.
      initialDelayMs: { type: Number, default: 1000, min: 0 },
      // Cap for backoff (so attempts don't blow up to hours).
      maxDelayMs: { type: Number, default: 60 * 60 * 1000, min: 1000 },
    },
    // Audit metadata
    createdBy: { type: String, default: null },
  },
  { timestamps: true, collection: 'webhooks' }
);

// Index accelerating the hot path: "find all active webhooks subscribed to
// event X". Compound index so a partial subscribe lookup is cheap.
WebhookSchema.index({ active: 1, events: 1 });

// Don't leak the secret in JSON output by default; callers that need it can
// use `toAdminJSON()` only for the one-time creation response.
WebhookSchema.methods.toAdminJSON = function toAdminJSON() {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  // Secret is included only in the one-time registration response.
  return obj;
};

WebhookSchema.methods.toClientJSON = function toClientJSON() {
  const obj = this.toObject();
  obj.id = obj._id.toString();
  delete obj._id;
  delete obj.__v;
  // Never expose the raw secret in default listings.
  obj.secretPreview = obj.secret ? `${obj.secret.slice(0, 4)}…${obj.secret.slice(-4)}` : null;
  delete obj.secret;
  return obj;
};

module.exports = mongoose.model('Webhook', WebhookSchema);
