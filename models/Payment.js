const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  idempotencyKey: { type: String, default: null, index: true },
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['MYZ', 'XMR'], required: true },
  reference: { type: String, default: null },
  callbackUrl: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'],
    default: 'PENDING',
    index: true
  },
  txId: { type: String, default: null },
  confirmations: { type: Number, default: 0 },
  webhookSecret: { type: String, default: null },
  audit: { type: Array, default: [] },
  deliveries: { type: Array, default: [] },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
}, { versionKey: false });

PaymentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', PaymentSchema);
