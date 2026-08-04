const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  userId: { type: String, index: true },
  action: { type: String, required: true, index: true },
  resource: { type: String, index: true },
  resourceId: { type: String, index: true },
  ip: { type: String },
  userAgent: { type: String },
  method: { type: String },
  endpoint: { type: String },
  statusCode: { type: Number },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, index: true }
});

AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
