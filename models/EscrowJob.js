const mongoose = require('mongoose');

const EscrowJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  clientId: { type: String, required: true, index: true },
  robotId: { type: String, required: true, index: true },
  currency: { type: String, enum: ['MYZ', 'XMR'], required: true },
  amount: { type: Number, required: true },
  fee: { type: Number, required: true },
  netAmount: { type: Number, required: true },
  state: {
    type: String,
    enum: ['LOCKED', 'DELIVERED', 'PAYING_OUT', 'RELEASED', 'REFUNDED', 'DISPUTED'],
    default: 'LOCKED',
    index: true
  },
  lockTx: { type: String, default: null },
  proof: { type: String, default: null },
  payouts: { type: Array, default: [] },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  deliveredAt: { type: String, default: null },
  deliveryDeadline: { type: String, required: true },
  disputeDeadline: { type: String, default: null },
  events: { type: Array, default: [] },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { versionKey: false });

// The tick sweeps on these two deadlines, so they carry the index.
EscrowJobSchema.index({ state: 1, deliveryDeadline: 1 });
EscrowJobSchema.index({ state: 1, disputeDeadline: 1 });

module.exports = mongoose.model('EscrowJob', EscrowJobSchema);
