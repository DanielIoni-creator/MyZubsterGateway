const mongoose = require('mongoose');

const ReputationNFTSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', required: true },
  tokenId: { type: String, required: true },
  contractAddress: { type: String, required: true },
  blockchain: { type: String, enum: ['tari', 'ethereum', 'polygon'], default: 'tari' },
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, default: '' },
  metadata: { type: Object, default: {} },
  threshold: { type: Number, required: true },
  mintedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

module.exports = mongoose.model('ReputationNFT', ReputationNFTSchema);
