/**
 * Robot Stats Service - Bounty P2 (#266)
 *
 * Aggrega le statistiche sui robot esposte da GET /api/robot/stats.
 * Le sorgenti sono due e vengono unite per robotId:
 *   1. lo stato in memoria di robot_brain (sempre disponibile, sempre fresco)
 *   2. la collection Mongo `robots`, quando la connessione è attiva
 * Lo stato in memoria vince sui documenti persistiti, perché è quello su cui
 * operano assign/execute/deliver/dispute.
 *
 * Il risultato è tenuto in una cache in-process con TTL breve, così l'endpoint
 * regge il polling di una dashboard senza ricalcolare a ogni richiesta.
 */

const mongoose = require('mongoose');
const robotBrain = require('../robot_brain');
const Robot = require('../models/Robot');

const DEFAULT_TTL_SECONDS = 10;
const ACTIVE_STATUSES = ['working', 'delivering'];

let cache = null; // { data, expiresAt, generatedAt }

function cacheTtlMs() {
  const configured = parseInt(process.env.ROBOT_STATS_CACHE_TTL, 10);
  const seconds = Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_TTL_SECONDS;
  return seconds * 1000;
}

function round(value, decimals = 2) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalize(robot) {
  return {
    robotId: robot.robotId,
    name: robot.name || null,
    status: robot.status || 'idle',
    jobsCompleted: Number(robot.jobsCompleted) || 0,
    reputation: Number(robot.reputation) || 0,
    totalEarned: Number(robot.totalEarned) || 0,
    hasCurrentJob: !!robot.currentJob,
    createdAt: robot.createdAt ? new Date(robot.createdAt).toISOString() : null
  };
}

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

/**
 * Unisce robot in memoria e robot persistiti. La memoria ha la precedenza.
 */
async function collectRobots() {
  const byId = new Map();
  const sources = { memory: 0, database: 0 };

  if (isMongoConnected()) {
    try {
      const docs = await Robot.find({}).lean();
      for (const doc of docs) {
        byId.set(doc.robotId, normalize(doc));
      }
      sources.database = docs.length;
    } catch (err) {
      // La persistenza è opzionale: se Mongo non risponde le statistiche
      // restano valide sullo stato in memoria.
      console.error('robotStats: lettura da MongoDB fallita:', err.message);
    }
  }

  for (const robot of robotBrain.getAllRobots()) {
    byId.set(robot.robotId, normalize(robot));
    sources.memory += 1;
  }

  return { robots: Array.from(byId.values()), sources };
}

function buildStats(robots, sources) {
  const byStatus = { idle: 0, working: 0, delivering: 0, dispute: 0 };
  let totalJobsCompleted = 0;
  let totalEarned = 0;
  let totalReputation = 0;
  let jobsInProgress = 0;

  for (const robot of robots) {
    byStatus[robot.status] = (byStatus[robot.status] || 0) + 1;
    totalJobsCompleted += robot.jobsCompleted;
    totalEarned += robot.totalEarned;
    totalReputation += robot.reputation;
    if (robot.hasCurrentJob) jobsInProgress += 1;
  }

  const totalRobots = robots.length;
  const activeRobots = ACTIVE_STATUSES.reduce((sum, status) => sum + (byStatus[status] || 0), 0);

  const topRobots = robots
    .slice()
    .sort((a, b) => b.jobsCompleted - a.jobsCompleted || b.reputation - a.reputation)
    .slice(0, 5)
    .map(({ robotId, name, status, jobsCompleted, reputation, totalEarned: earned }) => ({
      robotId, name, status, jobsCompleted, reputation, totalEarned: round(earned)
    }));

  return {
    totalRobots,
    activeRobots,
    idleRobots: byStatus.idle || 0,
    disputeRobots: byStatus.dispute || 0,
    byStatus,
    jobsInProgress,
    totalJobsCompleted,
    averageJobsCompleted: totalRobots ? round(totalJobsCompleted / totalRobots) : 0,
    averageReputation: totalRobots ? round(totalReputation / totalRobots) : 0,
    totalEarned: round(totalEarned),
    topRobots,
    sources
  };
}

/**
 * @param {{ refresh?: boolean }} [options] refresh=true ignora la cache.
 */
async function getRobotStats(options = {}) {
  const now = Date.now();
  const ttl = cacheTtlMs();

  if (!options.refresh && cache && now < cache.expiresAt) {
    return {
      ...cache.data,
      cache: { cached: true, generatedAt: cache.generatedAt, ttlSeconds: ttl / 1000 }
    };
  }

  const { robots, sources } = await collectRobots();
  const data = buildStats(robots, sources);
  const generatedAt = new Date(now).toISOString();

  cache = ttl > 0 ? { data, expiresAt: now + ttl, generatedAt } : null;

  return { ...data, cache: { cached: false, generatedAt, ttlSeconds: ttl / 1000 } };
}

function clearRobotStatsCache() {
  cache = null;
}

module.exports = { getRobotStats, clearRobotStatsCache, buildStats };
