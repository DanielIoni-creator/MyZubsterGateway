const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  robotId: { type: String, required: true, unique: true, index: true },
  name: { type: String },
  category: { type: String, default: 'general', index: true },
  jobsCompleted: { type: Number, default: 0 },
  jobsFailed: { type: Number, default: 0 },
  totalEarned: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  reputation: { type: Number, default: 0 },
  postsGenerated: { type: Number, default: 0 },
  engagementScore: { type: Number, default: 0 },
  likesReceived: { type: Number, default: 0 },
  sharesReceived: { type: Number, default: 0 },
  commentsReceived: { type: Number, default: 0 },
  roi: { type: Number, default: 0 },
  costPerJob: { type: Number, default: 0 },
  revenuePerJob: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

AnalyticsSchema.index({ engagementScore: -1 });
AnalyticsSchema.index({ roi: -1 });
AnalyticsSchema.index({ jobsCompleted: -1 });

AnalyticsSchema.statics.trackJob = async function(robotId, name, category, jobData) {
  const { success, earned, spent } = jobData;
  const update = {
    name, category, lastActive: new Date(), updatedAt: new Date(),
    '$inc': { jobsCompleted: success ? 1 : 0, jobsFailed: success ? 0 : 1, totalEarned: earned || 0, totalSpent: spent || 0 }
  };
  const doc = await this.findOneAndUpdate({ robotId }, { '$set': { name, category, lastActive: new Date(), updatedAt: new Date() }, '$inc': { jobsCompleted: success ? 1 : 0, jobsFailed: success ? 0 : 1, totalEarned: earned || 0, totalSpent: spent || 0 } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  const rev = doc.totalEarned;
  const cost = doc.totalSpent || 1;
  doc.roi = ((rev - cost) / cost * 100);
  doc.costPerJob = doc.jobsCompleted > 0 ? cost / doc.jobsCompleted : 0;
  doc.revenuePerJob = doc.jobsCompleted > 0 ? rev / doc.jobsCompleted : 0;
  await doc.save();
  return doc;
};

AnalyticsSchema.statics.getTopRobots = async function(limit = 10, sortBy = 'roi') {
  const sorts = { roi: { roi: -1 }, jobs: { jobsCompleted: -1 }, engagement: { engagementScore: -1 }, revenue: { totalEarned: -1 } };
  return this.find().sort(sorts[sortBy] || sorts.roi).limit(limit).select('-__v');
};

AnalyticsSchema.statics.getROIByCategory = async function() {
  return this.aggregate([
    { '$group': { _id: '$category', totalRobots: { '$sum': 1 }, avgROI: { '$avg': '$roi' }, totalRevenue: { '$sum': '$totalEarned' }, totalCost: { '$sum': '$totalSpent' }, totalJobs: { '$sum': '$jobsCompleted' }, avgEngagement: { '$avg': '$engagementScore' } } },
    { '$project': { category: '$_id', totalRobots: 1, avgROI: { '$round': ['$avgROI', 2] }, totalRevenue: 1, totalCost: 1, netProfit: { '$subtract': ['$totalRevenue', '$totalCost'] }, totalJobs: 1, avgEngagement: { '$round': ['$avgEngagement', 2] }, _id: 0 } },
    { '$sort': { avgROI: -1 } }
  ]);
};

AnalyticsSchema.statics.getEngagementAnalytics = async function() {
  return this.aggregate([
    { '$group': { _id: '$category', totalPosts: { '$sum': '$postsGenerated' }, totalLikes: { '$sum': '$likesReceived' }, totalShares: { '$sum': '$sharesReceived' }, totalComments: { '$sum': '$commentsReceived' }, avgEngagementScore: { '$avg': '$engagementScore' }, robotCount: { '$sum': 1 } } },
    { '$project': { category: '$_id', totalPosts: 1, totalLikes: 1, totalShares: 1, totalComments: 1, engagementRate: { '$round': [{ '$cond': [{ '$gt': ['$totalPosts', 0] }, { '$multiply': [{ '$divide': [{ '$add': ['$totalLikes', '$totalShares', '$totalComments'] }, '$totalPosts'] }, 100] }, 0] }, 2] }, avgEngagementScore: { '$round': ['$avgEngagementScore', 2] }, robotCount: 1, _id: 0 } },
    { '$sort': { avgEngagementScore: -1 } }
  ]);
};

module.exports = mongoose.model('Analytics', AnalyticsSchema);
