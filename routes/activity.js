const express = require('express');
const auth = require('../middleware/auth');
const ActivityLogService = require('../services/activityLogService');

const router = express.Router();
const adminRouter = express.Router();

function requireAdmin(req, res, next) {
  if (req.user?.role === 'admin') return next();

  return res.status(403).json({
    success: false,
    error: req.t('admin.required'),
  });
}

router.get('/me', auth, async (req, res) => {
  try {
    const logs = await ActivityLogService.listActivities(req.query, req.user._id);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/logout', auth, async (req, res) => {
  try {
    const log = await ActivityLogService.recordActivity({
      user: req.user._id,
      action: 'logout',
      ip: req.ip,
      userAgent: req.get('User-Agent') || null,
      method: req.method,
      path: req.originalUrl?.split('?')[0] || req.path,
      statusCode: 200,
      resourceType: 'auth',
      metadata: { success: true },
    });

    res.json({
      success: true,
      data: { id: log._id, action: log.action, timestamp: log.timestamp },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const logs = await ActivityLogService.listActivities(req.query);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.adminRouter = adminRouter;
