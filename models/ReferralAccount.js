const mongoose = require('mongoose');

const ReferralSchema = new mongoose.Schema({
  referredShopId: { type: String, required: true },
  referredWalletAddress: { type: String, required: true },
  rewardMYZ: { type: Number, required: true, default: 5 },
  creditedAt: { type: Date, default: Date.now }
}, { _id: false });

const ReferralAccountSchema = new mongoose.Schema({
  shopId: { type: String, required: true, unique: true, index: true },
  walletAddress: { type: String, required: true },
  code: { type: String, required: true, unique: true, index: true },
  creditsAvailableMYZ: { type: Number, default: 0, min: 0 },
  creditsUsedMYZ: { type: Number, default: 0, min: 0 },
  referrals: { type: [ReferralSchema], default: [] }
}, { timestamps: true });

ReferralAccountSchema.index(
  { 'referrals.referredShopId': 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model('ReferralAccount', ReferralAccountSchema);
