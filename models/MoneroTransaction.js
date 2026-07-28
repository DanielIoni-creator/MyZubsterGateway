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
    enum: ['pending', 'confirmed', 'expired', 'failed'], 
    default: 'pending' 
  },
  confirmations: { type: Number, default: 0 },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 60 * 60 * 1000) }, // 1 ora
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MoneroTransaction', MoneroTransactionSchema);
