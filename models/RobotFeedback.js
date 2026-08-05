const mongoose = require('mongoose');

const RobotFeedbackSchema = new mongoose.Schema({
  feedbackId: { type: String, required: true, unique: true, index: true },
  robotId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  jobId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Indici per ricerche rapide
RobotFeedbackSchema.index({ robotId: 1, createdAt: -1 });
RobotFeedbackSchema.index({ userId: 1, createdAt: -1 });

// Reputation calculation: weighted score based on ratings, completed jobs, disputes
RobotFeedbackSchema.statics.getReputation = async function(robotId) {
  const feedbacks = await this.find({ robotId });
  const total = feedbacks.length;
  if (total === 0) return { score: 0, badge: 'Newcomer', totalJobs: 0, avgRating: 0 };

  const avgRating = feedbacks.reduce((s, f) => s + f.rating, 0) / total;
  const score = Math.round((avgRating * 20) + (Math.min(total, 50) * 0.4));
  const badge = score >= 95 ? 'Platinum' : score >= 80 ? 'Gold' : score >= 60 ? 'Silver' : score >= 30 ? 'Bronze' : 'Newcomer';

  return { score, badge, totalJobs: total, avgRating: Math.round(avgRating * 10) / 10 };
};

// Metodo per aggiungere un feedback
RobotFeedbackSchema.statics.addFeedback = async function({ robotId, userId, jobId, rating, comment }) {
  const feedback = new this({
    feedbackId: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    robotId,
    userId,
    jobId,
    rating,
    comment
  });
  await feedback.save();
  return feedback;
};

// Metodo per ottenere tutti i feedback di un robot
RobotFeedbackSchema.statics.getFeedbacks = async function(robotId, limit = 50) {
  return this.find({ robotId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('RobotFeedback', RobotFeedbackSchema);
