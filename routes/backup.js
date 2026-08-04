const express = require('express');
const router = express.Router();
const backupService = require('../services/backupService');

console.log('🔍 routes/backup.js loaded');

/**
 * POST /api/backup/create
 * Create a manual backup.
 */
router.post('/create', async (req, res) => {
  console.log('📦 POST /api/backup/create called');
  try {
    const backup = await backupService.createBackup('manual');
    res.status(201).json({
      success: true,
      message: 'Backup creato con successo',
      data: backup
    });
  } catch (err) {
    console.error('❌ POST /api/backup/create error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/backup/restore
 * Restore from a backup. Body: { backupId }
 */
router.post('/restore', async (req, res) => {
  console.log('🔄 POST /api/backup/restore called');
  try {
    const { backupId } = req.body;
    if (!backupId) {
      return res.status(400).json({
        success: false,
        error: 'backupId è obbligatorio'
      });
    }

    const result = await backupService.restoreBackup(backupId);
    res.json({
      success: true,
      message: 'Restore completato con successo',
      data: result
    });
  } catch (err) {
    console.error('❌ POST /api/backup/restore error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/backups
 * List backup history.
 */
router.get('/', async (req, res) => {
  console.log('📋 GET /api/backups called');
  try {
    const { status, limit, offset } = req.query;
    const options = {};
    if (status) options.status = status;
    if (limit) options.limit = parseInt(limit, 10);
    if (offset) options.offset = parseInt(offset, 10);

    const backups = await backupService.listBackups(options);
    res.json({
      success: true,
      count: backups.length,
      data: backups
    });
  } catch (err) {
    console.error('❌ GET /api/backups error:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/backups/:id
 * Get a single backup by ID.
 */
router.get('/:id', async (req, res) => {
  console.log(`📋 GET /api/backups/${req.params.id} called`);
  try {
    const backup = await backupService.getBackup(req.params.id);
    res.json({
      success: true,
      data: backup
    });
  } catch (err) {
    console.error(`❌ GET /api/backups/${req.params.id} error:`, err);
    const statusCode = err.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
