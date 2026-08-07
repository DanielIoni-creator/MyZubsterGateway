const mongoose = require('mongoose');

const VerificationRecordSchema = new mongoose.Schema({
  paymentId: { type: String, required: true, unique: true, index: true },
  txId: { type: String, required: true, index: true },
  currency: { type: String, enum: ['MYZ', 'XMR'], default: 'XMR' },
  expectedAmount: { type: Number, required: true },
  observedAmount: { type: Number, default: null },
  expectedAddress: { type: String, default: null },
  verdict: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'REJECTED'],
    default: 'PENDING',
    index: true
  },
  confirmations: { type: Number, default: 0 },
  requiredConfirmations: { type: Number, required: true },
  anomalies: { type: Array, default: [] },
  height: { type: Number, default: null },
  history: { type: Array, default: [] },
  firstSeenAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { versionKey: false });

VerificationRecordSchema.index({ verdict: 1, updatedAt: -1 });

module.exports = mongoose.model('VerificationRecord', VerificationRecordSchema);
