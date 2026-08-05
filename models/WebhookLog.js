const mongoose = require('mongoose');

const WebhookLogSchema = new mongoose.Schema({
  event: { type: String, required: true },
  action: { type: String },
  prNumber: { type: Number },
  contributor: { type: String },
  repo: { type: String },
  merged: { type: Boolean, default: false },
  bountyCreated: { type: Boolean, default: false },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
});

WebhookLogSchema.index({ createdAt: -1 });
WebhookLogSchema.index({ contributor: 1 });

module.exports = mongoose.model('WebhookLog', WebhookLogSchema);
