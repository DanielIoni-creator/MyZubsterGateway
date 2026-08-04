const mongoose = require('mongoose');

const RobotSchema = new mongoose.Schema({
  robotId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  walletAddress: { type: String, required: true },
  status: { type: String, enum: ['idle', 'working', 'delivering', 'dispute'], default: 'idle' },
  currentJob: { type: mongoose.Schema.Types.Mixed, default: null },
  reputation: { type: Number, default: 0 },
  jobsCompleted: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  history: { type: Array, default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Robot', RobotSchema);
