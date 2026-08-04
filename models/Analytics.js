const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  event: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  resource: { type: String },
  resourceId: { type: String },
  value: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true }
});

AnalyticsSchema.index({ event: 1, timestamp: -1 });
AnalyticsSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Analytics', AnalyticsSchema);
