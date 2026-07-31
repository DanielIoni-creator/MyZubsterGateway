const mongoose = require('mongoose');

const AiAgentDecisionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  escrowId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Escrow',
    index: true
  },
  decision: {
    type: String,
    enum: ['approve', 'reject', 'pending_review'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  evidence: [{
    type: {
      type: String,
      enum: ['log', 'api_check', 'file_upload', 'external_api', 'manual_review']
    },
    source: String,
    summary: String,
    timestamp: { type: Date, default: Date.now }
  }],
  webhookData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  aiModel: {
    type: String,
    default: 'deepseek-chat'
  },
  signedAt: {
    type: Date,
    default: null
  },
  signatureHash: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'signed', 'rejected', 'expired'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

AiAgentDecisionSchema.index({ orderId: 1, createdAt: -1 });

module.exports = mongoose.model('AiAgentDecision', AiAgentDecisionSchema);
