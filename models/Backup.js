const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  filepath: { type: String, required: true },
  size: { type: Number, required: true },        // bytes
  collections: [{ type: String }],               // nom des collections backupées
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'failed'],
    default: 'in_progress'
  },
  type: {
    type: String,
    enum: ['manual', 'scheduled'],
    default: 'manual'
  },
  storage: {
    type: String,
    enum: ['filesystem', 's3'],
    default: 'filesystem'
  },
  s3Url: { type: String, default: null },
  error: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});

BackupSchema.index({ createdAt: -1 });
BackupSchema.index({ status: 1 });

module.exports = mongoose.model('Backup', BackupSchema);
