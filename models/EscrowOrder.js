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

/**
 * Valid state transitions for the escrow state machine.
 * Key: current status → array of allowed next statuses.
 */
const STATE_TRANSITIONS = {
  pending: ['funded', 'cancelled'],
  funded: ['completed', 'disputed'],
  completed: [],
  disputed: ['refunded', 'completed', 'escalated'],
  escalated: ['refunded', 'completed'],
  refunded: [],
  cancelled: [],
};

const EscrowOrderSchema = new mongoose.Schema(
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
    /**
     * Optimistic concurrency control version field.
     * Incremented on every update; queries use { _id, version } to
     * prevent lost updates.
     */
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

// ─── Indexes ──────────────────────────────────────────────────────────────────

EscrowOrderSchema.index({ status: 1, createdAt: -1 });
EscrowOrderSchema.index({ buyerId: 1, status: 1 });
EscrowOrderSchema.index({ sellerId: 1, status: 1 });
EscrowOrderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── Static: Generate order ID ────────────────────────────────────────────────

const crypto = require('crypto');

EscrowOrderSchema.statics.generateOrderId = function () {
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  const rand2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `ESC-${rand.slice(0, 4)}-${rand2.slice(0, 4)}`;
};

// ─── Static: Valid transitions (for service-layer checks) ────────────────────

EscrowOrderSchema.statics.getValidTransitions = function () {
  return STATE_TRANSITIONS;
};

// ─── Instance: transition status (validates & mutates state) ─────────────────

EscrowOrderSchema.methods.transitionTo = function (newStatus, actor, note) {
  const allowed = STATE_TRANSITIONS[this.status] || [];
  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Invalid state transition: ${this.status} → ${newStatus}. ` +
        `Allowed: [${allowed.join(', ')}]`
    );
    err.code = 'INVALID_TRANSITION';
    throw err;
  }

  this.status = newStatus;

  if (newStatus === 'completed') {
    this.completedAt = new Date();
  }

  this.timeline.push({
    status: newStatus,
    actor,
    note: note || '',
    timestamp: new Date(),
  });
};

module.exports = mongoose.model('EscrowOrder', EscrowOrderSchema);
module.exports.STATE_TRANSITIONS = STATE_TRANSITIONS;
