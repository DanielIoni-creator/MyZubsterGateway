const mongoose = require('mongoose');

const EscrowSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'OrderBook', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['XMR', 'token'], default: 'XMR' },
  status: {
    type: String,
    enum: ['pending', 'held', 'released', 'disputed', 'refunded', 'escalated'],
    default: 'pending'
  },
  moneroTxid: { type: String, default: null },
  releaseCondition: {
    type: String,
    enum: ['delivery_confirmed', 'time_expired', 'ai_resolved'],
    default: 'delivery_confirmed'
  },
  disputedAt: { type: Date },
  resolvedAt: { type: Date },
  aiDecision: { type: Object, default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
});

module.exports = mongoose.model('Escrow', EscrowSchema);
