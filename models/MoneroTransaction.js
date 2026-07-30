const mongoose = require('mongoose');

const MoneroTransactionSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderBook', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subaddress: { type: String, required: true }, // Indirizzo Monero generato
  amount: { type: Number, required: true }, // Quantità XMR da pagare
  amountPaid: { type: Number, default: 0 }, // XMR ricevuti
  moneroTxid: { type: String, default: null }, // TXID Monero
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'expired', 'failed', 'refund_pending', 'refunded'],
    default: 'pending' 
  },
  confirmations: { type: Number, default: 0 },
  verifiedAt: { type: Date, default: null },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verificationSource: { type: String, enum: ['monitor', 'admin'], default: null },
  refundRequestedAt: { type: Date, default: null },
  refundRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  refundAddress: { type: String, default: null },
  refundAmount: { type: Number, min: 0, default: null },
  refundTxid: { type: String, default: null },
  refundedAt: { type: Date, default: null },
  refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  refundError: { type: String, default: null },
  refundFailedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * 60 * 1000) }, // 1 ora
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

MoneroTransactionSchema.index({ status: 1, createdAt: -1 });
MoneroTransactionSchema.index({ buyerId: 1, createdAt: -1 });
MoneroTransactionSchema.index({ amount: 1 });

module.exports = mongoose.model('MoneroTransaction', MoneroTransactionSchema);
