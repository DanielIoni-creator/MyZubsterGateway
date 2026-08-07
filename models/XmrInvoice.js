const mongoose = require('mongoose');

// Atomic amounts are stored as strings, not Numbers: piconero exceeds the
// precision of a double, and a rounded balance is a wrong balance.
const XmrInvoiceSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  stationId: { type: String, default: null, index: true },
  pumpId: { type: String, default: null },
  address: { type: String, required: true, index: true },
  addressIndex: { type: Number, required: true },
  accountIndex: { type: Number, default: 0 },
  expectedAtomic: { type: String, required: true },
  expectedXmr: { type: String, required: true },
  paidAtomic: { type: String, default: '0' },
  paidXmr: { type: String, default: '0' },
  confirmations: { type: Number, default: 0 },
  requiredConfirmations: { type: Number, required: true },
  state: {
    type: String,
    enum: ['AWAITING_PAYMENT', 'PARTIALLY_PAID', 'CONFIRMING', 'PAID', 'EXPIRED'],
    default: 'AWAITING_PAYMENT',
    index: true
  },
  transactions: { type: Array, default: [] },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  expiresAt: { type: String, required: true },
  events: { type: Array, default: [] },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { versionKey: false });

XmrInvoiceSchema.index({ state: 1, expiresAt: 1 });

module.exports = mongoose.model('XmrInvoice', XmrInvoiceSchema);
