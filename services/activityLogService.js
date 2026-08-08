const jwt = require('jsonwebtoken');
const ActivityLog = require('../models/ActivityLog');

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'privateKey',
  'seed',
]);

function redact(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 4) return '[Truncated]';

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => redact(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((safe, [key, item]) => {
      safe[key] = SENSITIVE_KEYS.has(String(key).toLowerCase()) ? '[Redacted]' : redact(item, depth + 1);
      return safe;
    }, {});
  }

  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 500)}...`;
  }

  return value;
}

function getTokenPayload(req) {
  const header = req.get?.('Authorization') || req.headers?.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return jwt.decode(token);
  }
}

function getUserId(req, responseBody) {
  return (
    req.user?._id ||
    req.user?.id ||
    responseBody?.user?.id ||
    responseBody?.user?._id ||
    req.body?.userId ||
    req.body?.user_id ||
    getTokenPayload(req)?.id ||
    null
  );
}

function classifyRequest(req) {
  const method = req.method.toUpperCase();
  const path = req.originalUrl?.split('?')[0] || req.path || '';

  if (method === 'POST' && path === '/api/auth/login') {
    return { action: 'login', resourceType: 'auth' };
  }

  if (method === 'POST' && path === '/api/auth/logout') {
    return { action: 'logout', resourceType: 'auth' };
  }

  if (method === 'POST' && path === '/api/orders') {
    return { action: 'order_creation', resourceType: 'order' };
  }

  if (
    method === 'POST' &&
    (path.startsWith('/api/payments') ||
      path === '/api/monero/generate-subaddress' ||
      path.includes('/payment'))
  ) {
    return { action: 'payment_initiation', resourceType: 'payment' };
  }

  if (method === 'POST' && path.startsWith('/api/webhook')) {
    return { action: 'webhook_event', resourceType: 'webhook' };
  }

  return null;
}

function buildFilter(query = {}, forcedUserId = null) {
  const filter = {};

  if (forcedUserId) filter.user = forcedUserId;
  if (query.userId && !forcedUserId) filter.user = query.userId;
  if (query.action) filter.action = query.action;
  if (query.statusCode) filter.statusCode = Number(query.statusCode);
  if (query.method) filter.method = String(query.method).toUpperCase();
  if (query.path) filter.path = query.path;

  if (query.since || query.until) {
    filter.timestamp = {};
    if (query.since) filter.timestamp.$gte = new Date(query.since);
    if (query.until) filter.timestamp.$lte = new Date(query.until);
  }

  return filter;
}

async function recordActivity(activity) {
  return ActivityLog.create({
    ...activity,
    metadata: redact(activity.metadata || {}),
    timestamp: activity.timestamp || new Date(),
  });
}

async function listActivities(query = {}, forcedUserId = null) {
  const limit = Math.min(Number(query.limit) || 50, 200);
  return ActivityLog.find(buildFilter(query, forcedUserId))
    .sort({ timestamp: -1 })
    .limit(limit);
}

function captureResponseBody(res) {
  const originalJson = res.json;

  res.json = function patchedJson(body) {
    res.locals.activityResponseBody = body;
    return originalJson.call(this, body);
  };
}

function activityLogger() {
  return (req, res, next) => {
    captureResponseBody(res);

    res.on('finish', () => {
      const classification = classifyRequest(req);
      if (!classification) return;

      recordActivity({
        user: getUserId(req, res.locals.activityResponseBody),
        action: classification.action,
        ip: req.ip,
        userAgent: req.get('User-Agent') || null,
        method: req.method,
        path: req.originalUrl?.split('?')[0] || req.path,
        statusCode: res.statusCode,
        resourceType: classification.resourceType,
        resourceId:
          req.body?.orderId ||
          req.body?.order_id ||
          req.body?.paymentId ||
          req.body?.payment_id ||
          req.body?.webhookId ||
          null,
        metadata: {
          query: req.query,
          body: req.body,
          success: res.statusCode < 400,
        },
      }).catch((error) => {
        console.error('Activity logging failed:', error.message);
      });
    });

    next();
  };
}

module.exports = {
  activityLogger,
  buildFilter,
  classifyRequest,
  getUserId,
  listActivities,
  recordActivity,
  redact,
};
