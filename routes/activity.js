/**
 * @swagger
 * tags:
 *   name: Activity
 *   description: Activity audit logs
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ActivityLog = require('../models/ActivityLog');

/**
 * @swagger
 * /api/activity:
 *   get:
 *     summary: List activity logs for current user
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activity log list
 */
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const logs = await ActivityLog.find({ user: req.user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).lean();
    const total = await ActivityLog.countDocuments({ user: req.user._id });
    res.json({ success: true, data: logs, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin router for viewing all activity
const adminRouter = express.Router();

/**
 * @swagger
 * /api/admin/activity:
 *   get:
 *     summary: View all activity logs (admin)
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All activity logs
 */
adminRouter.get('/', auth, async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.adminRouter = adminRouter;

module.exports = router;
