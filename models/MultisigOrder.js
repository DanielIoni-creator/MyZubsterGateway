const mongoose = require('mongoose');

/**
 * All possible states in the multisig order lifecycle:
 *   pending → wallet_created → multisig_setup_initiated → multisig_ready
 *   → funding → funded → signed → submitted → confirmed → released
 *   Any state → failed / refunded
 */
const VALID_STATUSES = [
  'pending',
  'wallet_created',
  'multisig_setup_initiated',
  'multisig_ready',
  'funding',
  'funded',
  'signed',
  'submitted',
  'confirmed',
  'released',
  'refunded',
  'failed',
];

const statusEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: VALID_STATUSES,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { _id: false },
);

const participantSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    walletAddress: {
      type: String,
      default: null,
      trim: true,
    },
    preparedMultisigHex: {
      type: String,
      default: null,
    },
    signedTx: {
      type: String,
      default: null,
    },
  },
  { _id: false },
);

const multisigOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  multisigAddress: {
    type: String,
    default: null,
    trim: true,
  },
  participants: {
    type: [participantSchema],
    default: [],
    validate: {
      validator(arr) {
        return arr.length >= 2;
      },
      message: 'At least 2 participants are required',
    },
  },
  requiredSignatures: {
    type: Number,
    required: true,
    min: 1,
    default: 2,
  },
  totalParticipants: {
    type: Number,
    required: true,
    min: 2,
    default: 3,
  },
  amount: {
    type: String,
    default: '0',
  },
  currency: {
    type: String,
    default: 'XMR',
    uppercase: true,
  },
  destinationAddress: {
    type: String,
    default: null,
    trim: true,
  },
  statusHistory: {
    type: [statusEntrySchema],
    default: [],
  },
  currentStatus: {
    type: String,
    enum: VALID_STATUSES,
    default: 'pending',
  },
  txHash: {
    type: String,
    default: null,
    trim: true,
  },
  errorMessage: {
    type: String,
    default: null,
  },
  networkType: {
    type: String,
    enum: ['mainnet', 'testnet', 'stagenet'],
    default: 'testnet',
    lowercase: true,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

/* ──────────── Indexes ──────────── */
multisigOrderSchema.index({ currentStatus: 1 });
multisigOrderSchema.index({ networkType: 1 });
multisigOrderSchema.index({ createdAt: -1 });
multisigOrderSchema.index({ 'participants.userId': 1 });

/* ──────────── Hooks ──────────── */
multisigOrderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

/* ──────────── Instance methods ──────────── */

/**
 * Append a status entry and update currentStatus.
 * @param {string} status - One of VALID_STATUSES
 * @param {string} [note=''] - Optional human-readable note
 */
multisigOrderSchema.methods.addStatus = function addStatus(status, note = '') {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid status "${status}". Valid: ${VALID_STATUSES.join(', ')}`);
  }
  this.statusHistory.push({ status, timestamp: new Date(), note });
  this.currentStatus = status;
  if (status === 'failed' && note) {
    this.errorMessage = note;
  }
};

/**
 * Check whether a participant is part of this order.
 * @param {string} userId
 * @returns {boolean}
 */
multisigOrderSchema.methods.hasParticipant = function hasParticipant(userId) {
  return this.participants.some((p) => p.userId === userId);
};

/**
 * Count how many participants have already signed.
 * @returns {number}
 */
multisigOrderSchema.methods.signedCount = function signedCount() {
  return this.participants.filter((p) => p.signedTx).length;
};

/* ──────────── Statics ──────────── */

multisigOrderSchema.statics.VALID_STATUSES = VALID_STATUSES;

module.exports = mongoose.model('MultisigOrder', multisigOrderSchema);
