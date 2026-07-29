// models/WebhookDelivery.js
// Per-attempt delivery record for each webhook fan-out. Lets admins inspect
// "did the receiver get it?" without re-issuing requests.
// Created for issue #42: Implement Webhook System for Order Events.
'use strict';

const mongoose = require('mongoose');

const WebhookDeliverySchema = new mongoose.Schema(
  {
    webhook: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Webhook',
      required: true,
      index: true,
    },
    // Logical event name that triggered this delivery.
    event: { type: String, required: true, index: true },
    // 1-based attempt counter. 1 is the first attempt, 2 the first retry, etc.
    attempt: { type: Number, required: true, min: 1 },
    // Lifecycle status of THIS attempt.
    status: {
      type: String,
      enum: ['pending', 'delivered', 'failed', 'dead'],
      default: 'pending',
      index: true,
    },
    // Final / current status of the delivery record as a whole (set by
    // service once it transitions out of `pending`).
    finalStatus: {
      type: String,
      enum: ['pending', 'delivered', 'failed', 'dead'],
      default: 'pending',
      index: true,
    },
    responseStatus: { type: Number, default: null },
    responseBodyExcerpt: { type: String, default: null },
    durationMs: { type: Number, default: null },
    error: { type: String, default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    scheduledAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date, default: null },
    // Capped at 4KB to keep the table small for unrelated debugging.
  },
  { timestamps: true, collection: 'webhook_deliveries' }
);

WebhookDeliverySchema.index({ finalStatus: 1, scheduledAt: -1 });
WebhookDeliverySchema.index({ webhook: 1, createdAt: -1 });

module.exports = mongoose.model('WebhookDelivery', WebhookDeliverySchema);
