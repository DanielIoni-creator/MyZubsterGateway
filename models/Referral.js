const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  robotId: { type: String, required: true, unique: true },
  referrer: { type: String, required: true },
  feeCollected: { type: Number, default: 0 },
  totalTransactions: { type: Number, default: 0 },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  isActive: { type: Boolean, default: true }
}, { collection: 'referrals' });

module.exports = mongoose.model('Referral', referralSchema);
