const express = require('express');
const router = express.Router();
const robotBrain = require('../robot_brain');
const { getRobotStats } = require('../services/robotStatsService');

router.post('/create', (req, res) => {
  try {
    const { robotId, name, walletAddress } = req.body;
    if (!robotId || !name || !walletAddress) {
      return res.status(400).json({ error: 'Missing robotId, name, or walletAddress' });
    }
    const robot = robotBrain.createRobot(robotId, name, walletAddress);
    res.json({ success: true, data: robot });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/assign', async (req, res) => {
  try {
    const { robotId, jobId, clientId, amount, currency } = req.body;
    if (!robotId || !jobId || !clientId || !amount || !currency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const result = await robotBrain.assignJobToRobot(robotId, jobId, clientId, amount, currency);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/execute', async (req, res) => {
  try {
    const { robotId } = req.body;
    if (!robotId) return res.status(400).json({ error: 'Missing robotId' });
    const result = await robotBrain.executeJob(robotId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/deliver', async (req, res) => {
  try {
    const { robotId } = req.body;
    if (!robotId) return res.status(400).json({ error: 'Missing robotId' });
    const result = await robotBrain.deliverJob(robotId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/job/complete', async (req, res) => {
  try {
    const { robotId, jobId } = req.body;
    if (!robotId || !jobId) {
      return res.status(400).json({ error: 'Missing robotId or jobId' });
    }
    const robot = robotBrain.getRobotStatus(robotId);
    if (!robot) return res.status(404).json({ error: 'Robot not found' });
    if (robot.currentJob?.jobId !== jobId) {
      return res.status(400).json({ error: 'Job not assigned to this robot' });
    }
    await robotBrain.executeJob(robotId);
    const result = await robotBrain.deliverJob(robotId);
    res.json({ success: true, message: 'Job completed and delivered', data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/dispute', async (req, res) => {
  try {
    const { robotId, jobId, reason } = req.body;
    if (!robotId || !jobId || !reason) {
      return res.status(400).json({ error: 'Missing robotId, jobId, or reason' });
    }
    const result = await robotBrain.handleDispute(robotId, jobId, reason);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @openapi
 * /api/robot/stats:
 *   get:
 *     tags: [Robot]
 *     summary: Statistiche aggregate sui robot
 *     description: >
 *       Restituisce il totale dei robot, quanti sono attivi, quanti in disputa e
 *       la media dei job completati. Il risultato è servito da una cache
 *       in-process con TTL breve (`ROBOT_STATS_CACHE_TTL`, default 10s).
 *     parameters:
 *       - in: query
 *         name: refresh
 *         required: false
 *         schema: { type: boolean, default: false }
 *         description: Se `true` ignora la cache e ricalcola le statistiche.
 *     responses:
 *       200:
 *         description: Statistiche aggregate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRobots: { type: integer, example: 12 }
 *                     activeRobots: { type: integer, example: 4, description: "status working o delivering" }
 *                     idleRobots: { type: integer, example: 7 }
 *                     disputeRobots: { type: integer, example: 1 }
 *                     byStatus:
 *                       type: object
 *                       properties:
 *                         idle: { type: integer, example: 7 }
 *                         working: { type: integer, example: 3 }
 *                         delivering: { type: integer, example: 1 }
 *                         dispute: { type: integer, example: 1 }
 *                     jobsInProgress: { type: integer, example: 4 }
 *                     totalJobsCompleted: { type: integer, example: 58 }
 *                     averageJobsCompleted: { type: number, example: 4.83 }
 *                     averageReputation: { type: number, example: 4.83 }
 *                     totalEarned: { type: number, example: 1420.5 }
 *                     topRobots:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           robotId: { type: string, example: robot-001 }
 *                           name: { type: string, example: Logo Bot }
 *                           status: { type: string, example: idle }
 *                           jobsCompleted: { type: integer, example: 21 }
 *                           reputation: { type: integer, example: 21 }
 *                           totalEarned: { type: number, example: 512.4 }
 *                     sources:
 *                       type: object
 *                       description: Numero di robot letti da ciascuna sorgente.
 *                       properties:
 *                         memory: { type: integer, example: 12 }
 *                         database: { type: integer, example: 9 }
 *                     cache:
 *                       type: object
 *                       properties:
 *                         cached: { type: boolean, example: true }
 *                         generatedAt: { type: string, format: date-time }
 *                         ttlSeconds: { type: number, example: 10 }
 *       500:
 *         description: Errore nel calcolo delle statistiche
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 error: { type: string }
 */
router.get('/stats', async (req, res) => {
  try {
    const refresh = req.query.refresh === 'true' || req.query.refresh === '1';
    const stats = await getRobotStats({ refresh });
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error('Robot stats failed:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/status/:robotId', (req, res) => {
  try {
    const robot = robotBrain.getRobotStatus(req.params.robotId);
    res.json({ success: true, data: robot });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;
