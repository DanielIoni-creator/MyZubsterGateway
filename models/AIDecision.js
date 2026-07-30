const mongoose = require('mongoose');

const AIDecisionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  decision: {
    type: String,
    enum: ['APPROVE', 'REJECT', 'PENDING'],
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  reasoning: {
    type: String
  },
  evidence: {
    type: mongoose.Schema.Types.Mixed
  },
  signature: {
    type: String
  },
  processedBy: {
    type: String,
    default: 'ai-agent-v1'
  }
}, {
  timestamps: true
});

AIDecisionSchema.index({ orderId: 1 });
AIDecisionSchema.index({ decision: 1 });
AIDecisionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AIDecision', AIDecisionSchema);
