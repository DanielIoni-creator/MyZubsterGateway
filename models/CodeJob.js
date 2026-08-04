const mongoose = require('mongoose');

const CodeJobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  clientId: { type: String, required: true },
  robotId: { type: String, required: true },
  prompt: { type: String, required: true },
  language: { type: String, default: 'javascript' },
  status: { type: String, enum: ['pending', 'delivered', 'failed'], default: 'pending' },
  code: { type: String, default: null },
  escrowId: { type: String },
  prUrl: { type: String, default: null },
  prNumber: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now },
  deliveredAt: { type: Date, default: null }
});

module.exports = mongoose.model('CodeJob', CodeJobSchema);
