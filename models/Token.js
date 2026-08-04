const mongoose = require('mongoose');

const TokenSchema = new mongoose.Schema({
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  totalSupply: { type: Number, required: true },
  assetValue: { type: Number, required: true },
  tokenPrice: { type: Number, required: true },
  contractAddress: { type: String, default: "0x0000000000000000000000000000000000000000" },
  blockchain: { type: String, enum: ['tari', 'ethereum', 'polygon'], default: 'tari' },
  assetType: { type: String, enum: ['realestate', 'equity', 'commodity', 'art', 'debt', 'revenue'], required: true },
  assetDescription: { type: String, required: true },
  assetLocation: { type: String, default: '' },
  issuer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['draft', 'active', 'closed', 'paused'], default: 'draft' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Token', TokenSchema);
