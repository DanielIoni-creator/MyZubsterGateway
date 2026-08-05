const mongoose = require('mongoose');

const ProposalSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 5000 },
  proposer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: {
    type: String,
    enum: [
      'governance',
      'treasury',
      'development',
      'marketing',
      'community',
      'partnership',
      'other'
    ],
    default: 'other'
  },
  status: {
    type: String,
    enum: [
      'draft',
      'active',
      'passed',
      'rejected',
      'executed',
      'expired'
    ],
    default: 'draft'
  },
  votingStart: { type: Date, required: true },
  votingEnd: { type: Date, required: true },
  quorum: { type: Number, default: 100 }, // Numero minimo di token per validità
  forVotes: { type: Number, default: 0 },
  againstVotes: { type: Number, default: 0 },
  abstainVotes: { type: Number, default: 0 },
  totalVotes: { type: Number, default: 0 },
  executionTxid: { type: String, default: null },
  executionDate: { type: Date, default: null },
  metadata: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

// Indici
ProposalSchema.index({ status: 1 });
ProposalSchema.index({ votingEnd: 1 });
ProposalSchema.index({ proposer: 1 });

module.exports = mongoose.model('Proposal', ProposalSchema);
