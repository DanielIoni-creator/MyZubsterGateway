const mongoose = require('mongoose');

const RobotAnalyticsEventSchema = new mongoose.Schema({
  robotId: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  eventType: {
    type: String,
    required: true,
    enum: ['job_completed', 'cost', 'revenue', 'post_engagement'],
    index: true
  },
  amountMYZ: { type: Number, default: 0 },
  postId: { type: String, default: null },
  impressions: { type: Number, default: 0, min: 0 },
  likes: { type: Number, default: 0, min: 0 },
  comments: { type: Number, default: 0, min: 0 },
  shares: { type: Number, default: 0, min: 0 },
  occurredAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

RobotAnalyticsEventSchema.index({ robotId: 1, occurredAt: -1 });

module.exports = mongoose.model('RobotAnalyticsEvent', RobotAnalyticsEventSchema);
