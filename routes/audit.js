const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { logAudit } = require('../middleware/auditLogger');

// GET /api/audit - Query audit logs with filters
router.get('/', async (req, res) => {
  try {
    const { userId, action, resource, startDate, endDate, limit = 50, page = 1, format } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt[''] = new Date(startDate);
      if (endDate) filter.createdAt[''] = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      AuditLog.countDocuments(filter)
    ]);

    // CSV export
    if (format === 'csv') {
      const headers = 'userId,action,resource,resourceId,ip,method,endpoint,statusCode,createdAt';
      const rows = logs.map(l => [l.userId, l.action, l.resource, l.resourceId, l.ip, l.method, l.endpoint, l.statusCode, l.createdAt].map(v => '"' + String(v || '').replace(/"/g, '""')+ '"').join(','));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-export.csv');
      return res.send([headers, ...rows].join('
'));
    }

    res.json({
      success: true,
      data: logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit/stats - Summary statistics
router.get('/stats', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const [totalActions, topActions, topUsers, dailyCounts] = await Promise.all([
      AuditLog.countDocuments({ createdAt: { '': since } }),
      AuditLog.aggregate([
        { '': { createdAt: { '': since } } },
        { '': { _id: '', count: { '': 1 } } },
        { '': { count: -1 } },
        { '': 10 }
      ]),
      AuditLog.aggregate([
        { '': { createdAt: { '': since } } },
        { '': { _id: '', count: { '': 1 } } },
        { '': { count: -1 } },
        { '': 10 }
      ]),
      AuditLog.aggregate([
        { '': { createdAt: { '': since } } },
        { '': { _id: { '': { format: '%Y-%m-%d', date: '' } }, count: { '': 1 } } },
        { '': { _id: 1 } }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalActions,
        periodDays: parseInt(days),
        topActions,
        topUsers,
        dailyCounts
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
