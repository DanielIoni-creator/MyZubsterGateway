const ActivityLog = require('../models/ActivityLog');

/**
 * Express middleware to automatically log user activities
 * Attach to routes that need audit tracking
 */

/**
 * Log a specific action
 */
const logActivity = async (req, action, targetId, targetModel, metadata = {}) => {
  try {
    await ActivityLog.log({
      userId: req.user ? req.user._id : null,
      action,
      targetId,
      targetModel,
      ip: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.get('User-Agent') || '',
      metadata,
    });
  } catch (error) {
    console.error('Activity logging failed:', error.message);
  }
};

/**
 * Middleware factory: creates middleware that logs a specific action type
 * Usage: router.post('/order', logActivityMiddleware('order_create', 'body._id', 'Order'), handler)
 */
const logActivityMiddleware = (action, targetIdPath, targetModel) => {
  return async (req, res, next) => {
    // Store original end to intercept response
    const originalEnd = res.end;
    const originalJson = res.json;

    res.json = function(data) {
      res.locals.responseData = data;
      return originalJson.call(this, data);
    };

    res.end = function(...args) {
      const statusCode = res.statusCode;
      const targetId = targetIdPath ? 
        targetIdPath.split('.').reduce((obj, key) => obj?.[key], { body: req.body, params: req.params }) :
        null;

      logActivity(req, action, targetId, targetModel, {
        statusCode,
        success: statusCode >= 200 && statusCode < 300,
        method: req.method,
        path: req.originalUrl,
      });

      return originalEnd.apply(this, args);
    };

    next();
  };
};

/**
 * Activity routes for users to view their own logs and admins to view all
 */
const activityRoutes = (router) => {
  const { authenticate, authorize } = require('../middleware/auth');

  // User: view own activity
  router.get('/api/me/activity', authenticate, async (req, res) => {
    try {
      const { page = 1, limit = 20, action } = req.query;
      const filter = { userId: req.user._id };
      if (action) filter.action = action;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [logs, total] = await Promise.all([
        ActivityLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        ActivityLog.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          logs,
          pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch activity logs' });
    }
  });

  // Admin: view all activity
  router.get('/api/admin/activity', authenticate, authorize('admin'), async (req, res) => {
    try {
      const { page = 1, limit = 50, userId, action, date_from, date_to } = req.query;
      const filter = {};
      if (userId) filter.userId = userId;
      if (action) filter.action = action;
      if (date_from || date_to) {
        filter.createdAt = {};
        if (date_from) filter.createdAt.$gte = new Date(date_from);
        if (date_to) filter.createdAt.$lte = new Date(date_to);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [logs, total] = await Promise.all([
        ActivityLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('userId', 'email username')
          .lean(),
        ActivityLog.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          logs,
          pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to fetch activity logs' });
    }
  });
};

module.exports = { logActivity, logActivityMiddleware, activityRoutes };
