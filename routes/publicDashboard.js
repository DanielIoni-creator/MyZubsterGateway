/**
 * Public Dashboard API — Bounty #384
 *
 * Espone le metriche pubbliche dei robot senza richiedere autenticazione,
 * così una dashboard pubblica (o un widget embeddabile) può mostrare:
 *   - robot attivi e il loro status
 *   - MYZ spesi dai clienti
 *   - commissioni totali generate
 *   - robot più popolari
 *
 * Le metriche aggregate vengono calcolate dal servizio robotStatsService
 * (stesso flusso di GET /api/robot/stats) e, quando disponibili, integrate
 * con gli importi reali salvati in MongoDB (Payment / Reward).
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { getRobotStats } = require('../services/robotStatsService');
const Payment = require('../models/Payment');
const Reward = require('../models/Reward');

const ACTIVE_STATUSES = ['working', 'delivering'];

/**
 * Aggrega gli importi reali pagati (MYZ spesi dai clienti e commissioni).
 * Converte in numeri sicuri e gestisce l'assenza di collection.
 */
async function collectFinancials() {
  const out = { tokensSpent: 0, commissions: 0, totalRewards: 0 };

  const safeSum = (docs, keys) =>
    docs.reduce((sum, d) => {
      let v = 0;
      for (const k of keys) {
        const raw = d && d[k];
        const n = typeof raw === 'number' ? raw : parseFloat(raw);
        if (Number.isFinite(n)) v += n;
      }
      return sum + v;
    }, 0);

  if (mongoose.connection.readyState === 1) {
    try {
      const [payments, rewards] = await Promise.all([
        Payment.find({}).lean(),
        Reward.find({ status: 'completed' }).lean()
      ]);
      out.tokensSpent = safeSum(payments, ['amount', 'total', 'value']);
      out.commissions = Math.round(out.tokensSpent * 0.05 * 100) / 100; // 5% commissione stimata
      out.totalRewards = safeSum(rewards, ['amount', 'value']);
    } catch (err) {
      // Se la persistenza fallisce, restano 0 — la dashboard resta comunque funzionante.
      console.error('publicDashboard: lettura pagamenti fallita:', err.message);
    }
  }

  return out;
}

/**
 * GET /api/public-dashboard/stats
 * Metriche aggregate per la dashboard pubblica (no auth).
 */
router.get('/stats', async (req, res) => {
  try {
    const refresh = req.query.refresh === 'true';
    const stats = await getRobotStats({ refresh });
    const financials = await collectFinancials();

    const activeRobots = stats.activeRobots || 0;
    const totalRobots = stats.totalRobots || 0;

    res.json({
      success: true,
      data: {
        // Metriche robot
        totalRobots,
        activeRobots,
        idleRobots: stats.idleRobots || 0,
        disputeRobots: stats.disputeRobots || 0,
        jobsInProgress: stats.jobsInProgress || 0,
        totalJobsCompleted: stats.totalJobsCompleted || 0,
        averageJobsCompleted: stats.averageJobsCompleted || 0,
        averageReputation: stats.averageReputation || 0,
        byStatus: stats.byStatus || { idle: 0, working: 0, delivering: 0, dispute: 0 },
        topRobots: stats.topRobots || [],
        // Metriche finanziarie
        tokensSpent: Math.round(financials.tokensSpent * 100) / 100,
        commissions: Math.round(financials.commissions * 100) / 100,
        totalRewards: Math.round(financials.totalRewards * 100) / 100,
        // Metainfo
        generatedAt: new Date().toISOString(),
        cache: stats.cache || null
      }
    });
  } catch (err) {
    console.error('Public dashboard stats failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/public-dashboard/robots
 * Elenco pubblico dei robot (id, nome, stato, reputazione) — dati minimi.
 */
router.get('/robots', async (req, res) => {
  try {
    const stats = await getRobotStats({ refresh: true });
    const robots = (stats.topRobots || []).map(r => ({
      robotId: r.robotId,
      name: r.name,
      status: r.status,
      jobsCompleted: r.jobsCompleted,
      reputation: r.reputation,
      totalEarned: r.totalEarned
    }));
    res.json({ success: true, data: robots, generatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;