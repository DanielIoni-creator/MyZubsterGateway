const mongoose = require('mongoose');

const MultisigWalletSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    unique: true
  },
  multisigAddress: {
    type: String,
    required: true
  },
  threshold: {
    type: Number,
    default: 2
  },
  totalSigners: {
    type: Number,
    default: 3
  },
  buyerPublicKey: {
    type: String,
    required: true
  },
  sellerPublicKey: {
    type: String,
    required: true
  },
  agentPublicKey: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'funded', 'released', 'refunded', 'cancelled'],
    default: 'pending'
  },
  fundedAt: {
    type: Date
  },
  releasedAt: {
    type: Date
  }
}, {
  timestamps: true
});

MultisigWalletSchema.index({ orderId: 1 });
MultisigWalletSchema.index({ multisigAddress: 1 });
MultisigWalletSchema.index({ status: 1 });

module.exports = mongoose.model('MultisigWallet', MultisigWalletSchema);
