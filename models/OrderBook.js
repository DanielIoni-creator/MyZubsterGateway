const mongoose = require('mongoose');

const OrderBookSchema = new mongoose.Schema({
  token: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  price: { type: Number, required: true }, // Prezzo per token
  totalPrice: { type: Number, required: true }, // amount * price
  status: { type: String, enum: ['open', 'filled', 'cancelled', 'expired'], default: 'open' },
  moneroTxid: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 giorni
});

module.exports = mongoose.model('OrderBook', OrderBookSchema);
