const mongoose = require('mongoose');

const TimelineEntrySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    actor: { type: String, required: true },
    note: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const EvidenceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    url: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DisputeInfoSchema = new mongoose.Schema(
  {
    raisedBy: { type: String, required: true },
    reason: { type: String, required: true },
    evidence: { type: [EvidenceItemSchema], default: [] },
    aiAnalysis: { type: String, default: '' },
    aiDecision: {
      type: String,
      enum: ['refund_buyer', 'release_seller', 'manual_review', null],
      default: null,
    },
    resolvedBy: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
  },
  { _id: false }
);

const STATE_TRANSITIONS = {
  pending: ['funded', 'cancelled'],
  funded: ['completed', 'disputed'],
  completed: [],
  disputed: ['refunded', 'completed', 'escalated'],
  escalated: ['refunded', 'completed'],
  refunded: [],
  cancelled: [],
};

const EscrowSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      description: 'Human-readable order ID (e.g. ESC-XXXX-XXXX)',
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['XMR', 'token', 'USD'], default: 'XMR' },
    status: {
      type: String,
      enum: [
        'pending',
        'funded',
        'completed',
        'disputed',
        'escalated',
        'refunded',
        'cancelled',
      ],
      default: 'pending',
    },
    multisigAddress: { type: String, default: '' },
    moneroTxid: { type: String, default: null },
    description: { type: String, default: '' },
    timeline: { type: [TimelineEntrySchema], default: [] },
    disputeInfo: { type: DisputeInfoSchema, default: null },
    version: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    collection: 'escroworders',
  }
);

EscrowSchema.index({ status: 1, createdAt: -1 });
EscrowSchema.index({ buyerId: 1, createdAt: -1 });
EscrowSchema.index({ sellerId: 1, createdAt: -1 });

module.exports = mongoose.model('Escrow', EscrowSchema);
