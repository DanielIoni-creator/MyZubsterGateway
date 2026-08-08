const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true,
    unique: true
  },
  totalSupply: {
    type: Number,
    required: true
  },
  tokenPrice: {
    type: Number,
    required: true,
    default: 0
  },
  decimals: {
    type: Number,
    default: 18
  },
  assetType: {
    type: String,
    enum: ['realestate', 'stock', 'commodity', 'other'],
    default: 'other'
  },
  assetLocation: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Token', TokenSchema);
