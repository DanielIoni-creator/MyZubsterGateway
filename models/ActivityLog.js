const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: { type: String, required: true, trim: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    method: { type: String, default: null },
    path: { type: String, default: null, index: true },
    statusCode: { type: Number, default: null, index: true },
    resourceType: { type: String, default: null, index: true },
    resourceId: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ user: 1, timestamp: -1 });
ActivityLogSchema.index({ action: 1, timestamp: -1 });
ActivityLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
