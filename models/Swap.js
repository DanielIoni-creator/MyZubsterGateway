const mongoose = require('mongoose');

// Swap history model (Bounty B13)
const SwapSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, enum: ['MYZ_TO_XMR', 'XMR_TO_MYZ'], required: true },
  amountFrom: { type: Number, required: true },
  amountTo: { type: Number, required: true },
  rate: { type: Number, required: true },
  fee: { type: Number, default: 0 },
  feePercent: { type: Number, default: 2 },
  txIdFrom: { type: String },
  txIdTo: { type: String },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  error: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true },
  completedAt: { type: Date }
});

module.exports = mongoose.model('Swap', SwapSchema);
