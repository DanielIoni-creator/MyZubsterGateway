const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  robotId: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['recharge', 'payment', 'referral', 'escrow', 'escrow_release'], 
    required: true 
  },
  amount: { type: Number, required: true },
  fee: { type: Number, default: 0 },
  boscoFee: { type: Number, default: 0 },
  referralFee: { type: Number, default: 0 },
  referrer: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  txHash: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'transactions' });

module.exports = mongoose.model('Transaction', transactionSchema);
