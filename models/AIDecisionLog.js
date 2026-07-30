const mongoose = require('mongoose');

const AIDecisionLogSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['sign', 'reject', 'pending'],
      default: 'pending',
      required: true,
    },
    analysis: {
      type: String,
      default: '',
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    signature: {
      type: String,
      default: null,
    },
    signatureHex: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      default: '',
    },
    evidenceUrls: {
      type: [String],
      default: [],
    },
    dataSources: {
      type: [
        {
          type: { type: String, required: true },
          value: { type: String, required: true },
        },
      ],
      default: [],
    },
    verified: {
      type: Boolean,
      default: false,
    },
    statusCode: {
      type: String,
      enum: ['approved', 'rejected', 'pending_review'],
      default: 'pending_review',
    },
    decisionAt: {
      type: Date,
      default: null,
    },
    webhookPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

AIDecisionLogSchema.index({ orderId: 1, createdAt: -1 });
AIDecisionLogSchema.index({ statusCode: 1 });
AIDecisionLogSchema.index({ action: 1 });

module.exports = mongoose.model('AIDecisionLog', AIDecisionLogSchema);
