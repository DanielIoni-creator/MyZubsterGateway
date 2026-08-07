const mongoose = require('mongoose');

const LedgerEntrySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  transferId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  counterparty: { type: String, default: null },
  currency: { type: String, enum: ['MYZ', 'XMR'], required: true },
  direction: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
  amount: { type: Number, required: true, min: 0 },
  state: { type: String, enum: ['PENDING', 'POSTED', 'LOCKED', 'RELEASED'], default: 'POSTED', index: true },
  type: { type: String, enum: ['TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'HOLD', 'RELEASE'], required: true },
  reference: { type: String, default: null },
  idempotencyKey: { type: String, default: null, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: String, required: true }
}, { versionKey: false });

LedgerEntrySchema.index({ userId: 1, currency: 1, createdAt: -1 });

module.exports = mongoose.model('LedgerEntry', LedgerEntrySchema);
