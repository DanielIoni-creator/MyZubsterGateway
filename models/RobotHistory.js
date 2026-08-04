const mongoose = require('mongoose');

const RobotHistorySchema = new mongoose.Schema({
  robotId: { type: String, required: true, index: true },
  event: { type: String, required: true }, // 'created', 'job_assigned', 'job_completed', 'payment_received'
  jobId: { type: String, default: null },
  amount: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  metadata: { type: mongoose.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RobotHistory', RobotHistorySchema);
