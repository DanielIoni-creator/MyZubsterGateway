const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Backup = require('../models/Backup');
const { notifyUser } = require('../notifications');

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a MongoDB backup by dumping all collections to JSON files.
 * @param {string} trigger - 'manual' or 'scheduled'
 * @returns {Promise<Object>} The backup record
 */
async function createBackup(trigger = 'manual') {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `backup-${trigger}-${timestamp}.json`;
  const backupPath = path.join(BACKUP_DIR, backupFilename);

  // Create backup record
  const backupRecord = new Backup({
    filename: backupFilename,
    path: backupPath,
    type: 'local',
    status: 'in_progress',
    collections: []
  });

  await backupRecord.save();
  console.log(`📦 [Backup] Starting ${trigger} backup: ${backupFilename}`);

  try {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection not available');
    }

    const collections = await db.listCollections().toArray();
    const dump = {};

    for (const col of collections) {
      const colName = col.name;
      if (colName.startsWith('system.')) continue; // Skip system collections

      const docs = await db.collection(colName).find({}).toArray();
      dump[colName] = docs;
      backupRecord.collections.push(colName);
    }

    // Write dump to file
    const dumpContent = JSON.stringify(dump, null, 2);
    fs.writeFileSync(backupPath, dumpContent, 'utf8');

    const stats = fs.statSync(backupPath);
    backupRecord.size = stats.size;
    backupRecord.status = 'completed';
    backupRecord.completedAt = new Date();
    await backupRecord.save();

    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ [Backup] Completed: ${backupFilename} (${sizeMB} MB, ${backupRecord.collections.length} collections)`);

    // Notification
    await notifyUser('admin', `Backup ${trigger} completato con successo: ${backupFilename} (${sizeMB} MB)`);

    return backupRecord;
  } catch (err) {
    backupRecord.status = 'failed';
    backupRecord.error = err.message;
    await backupRecord.save();

    console.error(`❌ [Backup] Failed: ${err.message}`);

    // Notification
    await notifyUser('admin', `Backup ${trigger} FALLITO: ${err.message}`);

    throw err;
  }
}

/**
 * Restore MongoDB from a backup file.
 * @param {string} backupId - MongoDB _id of the backup record
 * @returns {Promise<Object>} Result of the restore operation
 */
async function restoreBackup(backupId) {
  const backupRecord = await Backup.findById(backupId);
  if (!backupRecord) {
    throw new Error(`Backup with id ${backupId} not found`);
  }

  if (backupRecord.status !== 'completed') {
    throw new Error(`Cannot restore backup with status '${backupRecord.status}'. Only 'completed' backups can be restored.`);
  }

  if (!fs.existsSync(backupRecord.path)) {
    throw new Error(`Backup file not found at path: ${backupRecord.path}`);
  }

  console.log(`🔄 [Restore] Starting restore from: ${backupRecord.filename}`);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB connection not available');
  }

  const dumpContent = fs.readFileSync(backupRecord.path, 'utf8');
  const dump = JSON.parse(dumpContent);

  const results = {};
  let totalDocs = 0;

  for (const [colName, docs] of Object.entries(dump)) {
    if (!Array.isArray(docs) || docs.length === 0) continue;

    // Drop existing collection and recreate with backup data
    try {
      await db.collection(colName).drop();
    } catch (e) {
      // Collection might not exist, that's fine
    }

    const sanitizedDocs = docs.map(doc => {
      const cleaned = { ...doc };
      delete cleaned._id; // Let MongoDB assign new IDs
      return cleaned;
    });

    if (sanitizedDocs.length > 0) {
      await db.collection(colName).insertMany(sanitizedDocs);
    }

    results[colName] = sanitizedDocs.length;
    totalDocs += sanitizedDocs.length;
    console.log(`  ✅ [Restore] Collection '${colName}': ${sanitizedDocs.length} documents`);
  }

  console.log(`✅ [Restore] Completed: ${Object.keys(results).length} collections, ${totalDocs} total documents`);

  // Notification
  await notifyUser('admin', `Restore completato da ${backupRecord.filename}: ${totalDocs} documenti ripristinati`);

  return {
    backupFilename: backupRecord.filename,
    restoredCollections: Object.keys(results).length,
    totalDocuments: totalDocs,
    details: results
  };
}

/**
 * List all backups with optional filtering.
 * @param {Object} options - Filter options
 * @returns {Promise<Array>} List of backup records
 */
async function listBackups(options = {}) {
  const { status, limit = 50, offset = 0 } = options;
  const query = {};
  if (status) query.status = status;

  const backups = await Backup.find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  return backups;
}

/**
 * Get a single backup by ID.
 * @param {string} backupId
 * @returns {Promise<Object>}
 */
async function getBackup(backupId) {
  const backup = await Backup.findById(backupId).lean();
  if (!backup) {
    throw new Error(`Backup with id ${backupId} not found`);
  }
  return backup;
}

/**
 * Delete old backups (keep last N).
 * @param {number} keepLast - Number of recent backups to keep
 * @returns {Promise<number>} Number of backups deleted
 */
async function cleanupOldBackups(keepLast = 7) {
  const backups = await Backup.find({ status: 'completed' })
    .sort({ createdAt: -1 })
    .lean();

  if (backups.length <= keepLast) return 0;

  const toDelete = backups.slice(keepLast);
  const ids = toDelete.map(b => b._id);

  // Delete files
  for (const backup of toDelete) {
    try {
      if (fs.existsSync(backup.path)) {
        fs.unlinkSync(backup.path);
      }
    } catch (e) {
      console.warn(`⚠️ [Backup] Could not delete file: ${backup.path}`);
    }
  }

  await Backup.deleteMany({ _id: { $in: ids } });
  console.log(`🧹 [Backup] Cleaned up ${toDelete.length} old backup(s), keeping last ${keepLast}`);
  return toDelete.length;
}

/**
 * Schedule daily backup using node-cron.
 * Runs at 03:00 AM every day by default.
 */
function scheduleDailyBackup() {
  try {
    const cron = require('node-cron');

    const cronExpression = process.env.BACKUP_CRON || '0 3 * * *';
    cron.schedule(cronExpression, async () => {
      console.log('⏰ [Backup] Scheduled daily backup triggered');
      try {
        await createBackup('scheduled');
      } catch (err) {
        console.error('❌ [Backup] Scheduled backup failed:', err.message);
      }
    });

    console.log(`📅 [Backup] Daily backup scheduled (cron: ${cronExpression})`);
    return true;
  } catch (err) {
    console.warn('⚠️ [Backup] node-cron not installed — daily backup not scheduled. Install with: npm install node-cron');
    return false;
  }
}

module.exports = {
  createBackup,
  restoreBackup,
  listBackups,
  getBackup,
  cleanupOldBackups,
  scheduleDailyBackup
};
