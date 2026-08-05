const RobotAnalyticsEvent = require('../models/RobotAnalyticsEvent');

class AnalyticsValidationError extends Error {}

function required(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AnalyticsValidationError(`${field} is required`);
  }
  return value.trim();
}

function nonNegative(value, field) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) {
    throw new AnalyticsValidationError(`${field} must be a non-negative number`);
  }
  return number;
}

function normalizeEvent(input) {
  const eventType = required(input.eventType, 'eventType');
  if (!['job_completed', 'cost', 'revenue', 'post_engagement'].includes(eventType)) {
    throw new AnalyticsValidationError('eventType is invalid');
  }
  return {
    robotId: required(input.robotId, 'robotId'),
    category: required(input.category, 'category'),
    eventType,
    amountMYZ: nonNegative(input.amountMYZ, 'amountMYZ'),
    postId: input.postId ? String(input.postId).trim() : null,
    impressions: nonNegative(input.impressions, 'impressions'),
    likes: nonNegative(input.likes, 'likes'),
    comments: nonNegative(input.comments, 'comments'),
    shares: nonNegative(input.shares, 'shares'),
    occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date()
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function addMetric(target, event) {
  target.revenueMYZ += event.eventType === 'revenue' ? event.amountMYZ : 0;
  target.costMYZ += event.eventType === 'cost' ? event.amountMYZ : 0;
  target.jobsCompleted += event.eventType === 'job_completed' ? 1 : 0;
  target.impressions += event.impressions;
  target.engagement += event.likes + (event.comments * 2) + (event.shares * 3);
}

function finalize(metric) {
  const roiPercent = metric.costMYZ > 0
    ? ((metric.revenueMYZ - metric.costMYZ) / metric.costMYZ) * 100
    : null;
  return {
    ...metric,
    revenueMYZ: round(metric.revenueMYZ),
    costMYZ: round(metric.costMYZ),
    roiPercent: roiPercent === null ? null : round(roiPercent),
    engagementRate: metric.impressions > 0 ? round((metric.engagement / metric.impressions) * 100) : 0
  };
}

function aggregate(events) {
  const robots = new Map();
  const categories = new Map();
  const posts = new Map();
  const seed = key => ({ key, revenueMYZ: 0, costMYZ: 0, jobsCompleted: 0, impressions: 0, engagement: 0 });

  for (const event of events) {
    if (!robots.has(event.robotId)) robots.set(event.robotId, seed(event.robotId));
    if (!categories.has(event.category)) categories.set(event.category, seed(event.category));
    addMetric(robots.get(event.robotId), event);
    addMetric(categories.get(event.category), event);

    if (event.postId) {
      if (!posts.has(event.postId)) {
        posts.set(event.postId, { postId: event.postId, robotId: event.robotId, category: event.category, impressions: 0, engagement: 0 });
      }
      const post = posts.get(event.postId);
      post.impressions += event.impressions;
      post.engagement += event.likes + (event.comments * 2) + (event.shares * 3);
    }
  }

  const byRobot = [...robots.values()].map(finalize)
    .sort((a, b) => b.revenueMYZ - a.revenueMYZ || b.engagement - a.engagement);
  const byCategory = [...categories.values()].map(finalize)
    .sort((a, b) => (b.roiPercent ?? -Infinity) - (a.roiPercent ?? -Infinity));
  const topPosts = [...posts.values()].map(post => ({
    ...post,
    engagementRate: post.impressions ? round((post.engagement / post.impressions) * 100) : 0
  })).sort((a, b) => b.engagement - a.engagement).slice(0, 10);

  return { byRobot, byCategory, topPosts, totalEvents: events.length, generatedAt: new Date().toISOString() };
}

function createRobotAnalyticsService(store = {
  create: data => RobotAnalyticsEvent.create(data).then(doc => doc.toObject()),
  find: query => RobotAnalyticsEvent.find(query).sort({ occurredAt: -1 }).lean()
}) {
  async function record(input) {
    return store.create(normalizeEvent(input));
  }

  async function report({ from, to } = {}) {
    const query = {};
    if (from || to) {
      query.occurredAt = {};
      if (from) query.occurredAt.$gte = new Date(from);
      if (to) query.occurredAt.$lte = new Date(to);
    }
    return aggregate(await store.find(query));
  }

  async function csv(filters) {
    const data = await report(filters);
    const rows = [['robotId', 'revenueMYZ', 'costMYZ', 'roiPercent', 'jobsCompleted', 'engagement', 'engagementRate']];
    for (const item of data.byRobot) {
      rows.push([item.key, item.revenueMYZ, item.costMYZ, item.roiPercent ?? '', item.jobsCompleted, item.engagement, item.engagementRate]);
    }
    return rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  }

  return { record, report, csv };
}

module.exports = { AnalyticsValidationError, aggregate, createRobotAnalyticsService };
