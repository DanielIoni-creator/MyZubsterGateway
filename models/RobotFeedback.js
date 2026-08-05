const mongoose = require('mongoose');

<<<<<<< HEAD
/**
 * RobotFeedback - Bounty BOT-6 (#343)
 *
 * Un feedback lasciato da un cliente su un job svolto da un robot.
 * La reputazione è derivata da questi documenti, mai scritta a mano.
 */
const RobotFeedbackSchema = new mongoose.Schema({
  robotId: { type: String, required: true, index: true },
  clientId: { type: String, required: true, index: true },
  // Il job a cui il feedback si riferisce: un cliente può valutare un robot
  // una sola volta per job (indice unico più sotto).
  jobId: { type: String, required: true, index: true },

  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: null, maxlength: 1000 },

  // Un feedback lasciato dopo una disputa pesa di più nel calcolo, perché
  // segnala un problema reale e non una semplice preferenza.
  disputed: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now, index: true }
});

RobotFeedbackSchema.index({ robotId: 1, createdAt: -1 });
// Un solo feedback per (robot, job, cliente): impedisce di gonfiare o
// affossare la reputazione con voti ripetuti sullo stesso lavoro.
RobotFeedbackSchema.index({ robotId: 1, jobId: 1, clientId: 1 }, { unique: true });
=======
const RobotFeedbackSchema = new mongoose.Schema({
  feedbackId: { type: String, required: true, unique: true, index: true },
  robotId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  jobId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Reputation calculation: weighted score based on ratings, completed jobs, disputes
RobotFeedbackSchema.statics.getReputation = async function(robotId) {
  const feedbacks = await this.find({ robotId });
  const total = feedbacks.length;
  if (total === 0) return { score: 0, badge: 'Newcomer', totalJobs: 0, avgRating: 0 };

  const avgRating = feedbacks.reduce((s, f) => s + f.rating, 0) / total;
  // Score: avg rating * 20 + bonus for volume (min(total, 50) * 0.4)
  const score = Math.round((avgRating * 20) + (Math.min(total, 50) * 0.4));
  const badge = score >= 95 ? 'Platinum' : score >= 80 ? 'Gold' : score >= 60 ? 'Silver' : score >= 30 ? 'Bronze' : 'Newcomer';

  return { score, badge, totalJobs: total, avgRating: Math.round(avgRating * 10) / 10 };
};
>>>>>>> ceef3d449 (feat: BOT-6 robot reputation system with ratings badges and leaderboard (closes #343))

module.exports = mongoose.model('RobotFeedback', RobotFeedbackSchema);
