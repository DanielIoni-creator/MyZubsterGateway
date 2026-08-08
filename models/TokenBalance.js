const mongoose = require('mongoose');

const TokenBalanceSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  tokenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Token',
    required: true
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  lockedBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

TokenBalanceSchema.index({ userId: 1, tokenId: 1 }, { unique: true });

module.exports = mongoose.model('TokenBalance', TokenBalanceSchema);
