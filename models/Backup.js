const mongoose = require('mongoose');

const BackupSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, default: 0 },
  type: { type: String, enum: ['local', 's3'], default: 'local' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
  collections: [{ type: String }],
  error: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null }
});

BackupSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Backup', BackupSchema);
