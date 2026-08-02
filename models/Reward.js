const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'XMR'
  },
  type: {
    type: String,
    enum: ['bounty', 'bonus', 'referral', 'contribution', 'auto'],
    default: 'bounty'
  },
  source: {
    type: String,
    trim: true
  },
  sourceId: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'claimed', 'expired'],
    default: 'pending'
  },
  claimedAt: {
    type: Date
  },
  txHash: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  metadata: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware pre-save per aggiornare updatedAt
RewardSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indici per performance
RewardSchema.index({ userId: 1 });
RewardSchema.index({ status: 1 });
RewardSchema.index({ createdAt: -1 });
RewardSchema.index({ type: 1 });

module.exports = mongoose.model('Reward', RewardSchema);
