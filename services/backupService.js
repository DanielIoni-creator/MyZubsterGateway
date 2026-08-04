const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const mongoose = require("mongoose");
const Backup = require("../models/Backup");

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, "..", "backups");

async function uploadToS3(filepath, filename) {
  try {
    const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
    const s3 = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    const bucket = process.env.S3_BACKUP_BUCKET || "myzubster-backups";
    const fileContent = fs.readFileSync(filepath);
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: "backups/" + filename,
      Body: fileContent,
    }));
    return "s3://" + bucket + "/backups/" + filename;
  } catch (err) {
    console.warn("S3 upload failed:", err.message);
    return null;
  }
}

async function createBackup(type) {
  if (!type) type = "manual";
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const fn = "myzubster-backup-" + ts + ".zip";
  const fp = path.join(BACKUP_DIR, fn);
  const rec = await Backup.create({
    filename: fn, filepath: fp, size: 0, collections: [],
    status: "in_progress", type,
    storage: process.env.S3_BACKUP_BUCKET ? "s3" : "filesystem",
  });
  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB not connected");
    const colls = await db.listCollections().toArray();
    const names = colls.map(c => c.name);
    const tmp = path.join(BACKUP_DIR, "tmp-" + ts);
    fs.mkdirSync(tmp, { recursive: true });
    let total = 0;
    for (const cn of names) {
      try {
        const docs = await db.collection(cn).find({}).toArray();
        const jp = path.join(tmp, cn + ".json");
        fs.writeFileSync(jp, JSON.stringify(docs, null, 2));
        total += fs.statSync(jp).size;
      } catch(e) { console.warn("Dump err " + cn, e.message); }
    }
    const cfg = { NODE_ENV: process.env.NODE_ENV, PORT: process.env.PORT, MONGODB_DB_NAME: process.env.MONGODB_DB_NAME, backedUpAt: new Date().toISOString() };
    fs.writeFileSync(path.join(tmp, "config.json"), JSON.stringify(cfg, null, 2));
    const zip = new AdmZip();
    zip.addLocalFolder(tmp);
    zip.writeZip(fp);
    total = fs.statSync(fp).size;
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
    let s3u = null;
    if (process.env.S3_BACKUP_BUCKET) s3u = await uploadToS3(fp, fn);
    rec.size = total;
    rec.collections = names;
    rec.status = "completed";
    rec.completedAt = new Date();
    rec.s3Url = s3u;
    rec.storage = s3u ? "s3" : "filesystem";
    await rec.save();
    console.log("Backup completed: " + fn);
    return rec;
  } catch (err) {
    rec.status = "failed"; rec.error = err.message; rec.completedAt = new Date();
    await rec.save();
    console.error("Backup failed:", err.message);
    throw err;
  }
}

async function restoreBackup(backupId) {
  const rec = await Backup.findById(backupId);
  if (!rec) throw new Error("Backup not found");
  if (rec.status !== "completed") throw new Error("Backup not completed");
  let fp = rec.filepath;
  if (rec.storage === "s3" && rec.s3Url) {
    fp = path.join(BACKUP_DIR, rec.filename);
    if (!fs.existsSync(fp)) {
      const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
      const s3 = new S3Client({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      const bucket = process.env.S3_BACKUP_BUCKET || "myzubster-backups";
      const resp = await s3.send(new GetObjectCommand({
        Bucket: bucket, Key: "backups/" + rec.filename,
      }));
      const body = await resp.Body.transformToByteArray();
      fs.writeFileSync(fp, Buffer.from(body));
    }
  }
  if (!fs.existsSync(fp)) throw new Error("File not found: " + fp);
  const tmp = path.join(BACKUP_DIR, "restore-" + Date.now());
  fs.mkdirSync(tmp, { recursive: true });
  const restoreZip = new AdmZip(fp);
  restoreZip.extractAllTo(tmp, true);
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB not connected");
  const files = fs.readdirSync(tmp).filter(f => f.endsWith(".json") && f !== "config.json");
  const restored = [];
  for (const f of files) {
    const cn = f.replace(".json", "");
    try {
      const docs = JSON.parse(fs.readFileSync(path.join(tmp, f), "utf-8"));
      if (docs.length > 0) {
        await db.collection(cn).drop().catch(() => {});
        await db.collection(cn).insertMany(docs);
      }
      restored.push(cn);
    } catch(ce) { console.warn("Restore err " + cn, ce.message); }
  }
  if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
  console.log("Restore completed: " + restored.length + " collections");
  return { restoredCollections: restored, backupId: rec._id, timestamp: rec.createdAt };
}

async function listBackups(page, limit) {
  page = page || 1; limit = limit || 20;
  const skip = (page - 1) * limit;
  const [backups, total] = await Promise.all([
    Backup.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Backup.countDocuments(),
  ]);
  return { backups, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function cleanupOldBackups(retentionDays) {
  retentionDays = retentionDays || 30;
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  const old = await Backup.find({ createdAt: { $lt: cutoff }, storage: "filesystem" });
  for (const b of old) {
    if (fs.existsSync(b.filepath)) fs.unlinkSync(b.filepath);
    await Backup.deleteOne({ _id: b._id });
  }
  console.log("Cleaned up " + old.length + " old backups");
  return old.length;
}

module.exports = { createBackup, restoreBackup, listBackups, cleanupOldBackups, BACKUP_DIR };
