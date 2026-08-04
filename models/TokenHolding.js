const mongoose = require('mongoose');

const TokenHoldingSchema = new mongoose.Schema({
  token: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, default: 0 },
  lockedAmount: { type: Number, default: 0 },
  lockedAmount: { type: Number, default: 0 },
  walletAddress: { type: String, required: true },
  purchasedAt: { type: Date, default: Date.now },
  purchasePrice: { type: Number, required: true },
  moneroTxid: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TokenHolding', TokenHoldingSchema);
