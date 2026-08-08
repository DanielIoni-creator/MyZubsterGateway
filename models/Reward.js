const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
  source: { 
    type: String, 
    enum: ['github_pr', 'bug_report', 'manual', 'animal_registry', 'plant_registry'], 
    default: 'github_pr' 
  },
  txId: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'], 
    default: 'pending' 
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Reward', RewardSchema);
