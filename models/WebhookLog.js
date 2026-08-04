const mongoose = require('mongoose');

const VerificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'auto_approved', 'needs_review', 'rejected', 'timeout'],
      default: 'pending',
    },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    reason: { type: String, default: null },
    signals: [{ type: String }],
    evaluatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const WebhookLogSchema = new mongoose.Schema(
  {
    source: { type: String, default: 'seller' },
    eventType: { type: String, required: true, index: true },
    orderId: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
    escrowId: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
    sellerId: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['received', 'verified', 'rejected', 'timeout', 'error'],
      default: 'received',
      index: true,
    },
    signature: {
      header: { type: String, default: null },
      valid: { type: Boolean, default: false },
      required: { type: Boolean, default: false },
      algorithm: { type: String, default: 'sha256' },
    },
    verification: { type: VerificationSchema, default: () => ({}) },
    error: { type: String, default: null },
    receivedAt: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

WebhookLogSchema.index({ orderId: 1, eventType: 1, receivedAt: -1 });
WebhookLogSchema.index({ escrowId: 1, status: 1, receivedAt: -1 });

module.exports = mongoose.model('WebhookLog', WebhookLogSchema);
