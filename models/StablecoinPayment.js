const mongoose = require('mongoose');

const stablecoinPaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['USDC', 'USDT'], required: true },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  recipient: { type: String, required: true },
  txHash: { type: String },
  networkFee: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  completedAt: { type: Date }
}, { timestamps: true });

stablecoinPaymentSchema.index({ currency: 1, status: 1 });
stablecoinPaymentSchema.index({ recipient: 1 });
stablecoinPaymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StablecoinPayment', stablecoinPaymentSchema);
