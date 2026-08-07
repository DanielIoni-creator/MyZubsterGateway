const mongoose = require('mongoose');

const DisputeSchema = new mongoose.Schema({
  disputeId: { type: String, required: true, unique: true, index: true },
  jobId: { type: String, required: true, index: true },
  claimantId: { type: String, required: true, index: true },
  respondentId: { type: String, required: true, index: true },
  reason: { type: String, required: true },
  amount: { type: Number, default: null },
  currency: { type: String, enum: ['MYZ', 'XMR', null], default: null },
  state: {
    type: String,
    enum: ['EVIDENCE', 'VOTING', 'RESOLVED'],
    default: 'EVIDENCE',
    index: true
  },
  evidence: { type: Array, default: [] },
  mediators: { type: [String], default: [] },
  votes: { type: Array, default: [] },
  outcome: { type: String, enum: ['RELEASE', 'REFUND', 'SPLIT', null], default: null },
  resolution: { type: mongoose.Schema.Types.Mixed, default: null },
  evidenceDeadline: { type: String, required: true },
  votingDeadline: { type: String, default: null },
  events: { type: Array, default: [] },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { versionKey: false });

// tick() sweeps on the two deadlines.
DisputeSchema.index({ state: 1, evidenceDeadline: 1 });
DisputeSchema.index({ state: 1, votingDeadline: 1 });

module.exports = mongoose.model('Dispute', DisputeSchema);
