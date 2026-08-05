const express = require("express");
const router = express.Router();
const cron = require("node-cron");
const { createBackup, restoreBackup, listBackups, cleanupOldBackups } = require("../services/backupService");
const { notifyUser } = require("../notifications");

// POST /api/backup/create - Manual backup trigger
router.post("/create", async (req, res) => {
  try {
    const { type } = req.body;
    const backup = await createBackup(type || "manual");
    res.status(201).json({
      success: true,
      message: "Backup created successfully",
      data: {
        id: backup._id,
        filename: backup.filename,
        size: backup.size,
        collections: backup.collections,
        status: backup.status,
        storage: backup.storage,
        createdAt: backup.createdAt,
        completedAt: backup.completedAt,
      },
    });
  } catch (err) {
    console.error("Backup creation failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/backup/restore
router.post("/restore", async (req, res) => {
  try {
    const { backupId } = req.body;
    if (!backupId) return res.status(400).json({ success: false, error: "backupId is required" });
    const result = await restoreBackup(backupId);
    res.json({ success: true, message: "Restore completed", data: result });
  } catch (err) {
    console.error("Restore failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/backup/list
router.get("/list", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await listBackups(page, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/backup/status
router.get("/status", async (req, res) => {
  try {
    const { backups, total } = await listBackups(1, 1);
    const last = backups.length > 0 ? backups[0] : null;
    res.json({ success: true, data: { totalBackups: total, lastBackup: last ? {
      id: last._id, filename: last.filename, status: last.status,
      size: last.size, createdAt: last.createdAt } : null } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/backup/cleanup
router.post("/cleanup", async (req, res) => {
  try {
    const { retentionDays } = req.body;
    const count = await cleanupOldBackups(retentionDays || 30);
    res.json({ success: true, message: "Cleanup completed", deletedCount: count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Scheduled daily backup at 03:00 UTC
cron.schedule("0 3 * * *", async () => {
  console.log("Scheduled backup starting...");
  try {
    const backup = await createBackup("scheduled");
    await notifyUser("admin", "Scheduled backup completed: " + backup.filename);
    if (new Date().getDay() === 0) await cleanupOldBackups(30);
  } catch (err) {
    console.error("Scheduled backup failed:", err);
    await notifyUser("admin", "Scheduled backup FAILED: " + err.message);
  }
});

console.log("Backup scheduler initialized (daily at 03:00 UTC)");

module.exports = router;
