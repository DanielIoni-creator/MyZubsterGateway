const mongoose = require('mongoose');

const BountySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  issueNumber: { type: Number, required: true, unique: true },
  issueUrl: { type: String, required: true },
  repository: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['open', 'in-progress', 'completed'], default: 'open' },
  assignedToUsername: { type: String },
  assignedToWallet: { type: String },
  paymentTxHash: { type: String },
  prNumber: { type: Number },
  prUrl: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Bounty', BountySchema);
