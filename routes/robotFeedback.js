/**
 * API feedback e reputazione robot - Bounty BOT-6 (#343)
 *
 *   POST /api/robot/feedback              lascia un feedback
 *   GET  /api/robot/feedback/:robotId     storico feedback del robot
 *   GET  /api/robot/reputation/:robotId   reputazione, badge e progresso
 *   GET  /api/robot/reputation            classifica
 *   GET  /api/robot/badges                soglie dei badge
 */

const express = require('express');
const router = express.Router();
const reputation = require('../services/reputationService');

function handle(res, err) {
  if (err instanceof reputation.ValidationError) {
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err instanceof reputation.ConflictError) {
    return res.status(409).json({ success: false, error: err.message });
  }
  console.error('Reputation API error:', err);
  res.status(500).json({ success: false, error: err.message });
}

/**
 * @openapi
 * /api/robot/feedback:
 *   post:
 *     tags: [Robot Reputation]
 *     summary: Lascia un feedback su un job svolto da un robot
 *     description: >
 *       Un cliente può lasciare un solo feedback per ogni coppia (robot, job).
 *       Un secondo tentativo risponde 409.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [robotId, clientId, jobId, rating]
 *             properties:
 *               robotId: { type: string, example: robot-001 }
 *               clientId: { type: string, example: alice }
 *               jobId: { type: string, example: job-42 }
 *               rating: { type: integer, minimum: 1, maximum: 5, example: 5 }
 *               comment: { type: string, maxLength: 1000 }
 *               disputed: { type: boolean, default: false, description: Feedback lasciato dopo una disputa }
 *     responses:
 *       201: { description: Feedback registrato, con la reputazione aggiornata }
 *       400: { description: Payload non valido }
 *       409: { description: Feedback già presente per questo job e cliente }
 */
router.post('/feedback', async (req, res) => {
  try {
    const feedback = await reputation.submitFeedback(req.body || {});
    const updated = await reputation.getReputation(feedback.robotId);
    res.status(201).json({ success: true, data: { feedback, reputation: updated } });
  } catch (err) {
    handle(res, err);
  }
});

/**
 * @openapi
 * /api/robot/feedback/{robotId}:
 *   get:
 *     tags: [Robot Reputation]
 *     summary: Storico dei feedback di un robot
 *     parameters:
 *       - { in: path, name: robotId, required: true, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *     responses:
 *       200: { description: Feedback paginati, dal più recente }
 */
router.get('/feedback/:robotId', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { items, total } = await reputation.findFeedback(
      { robotId: req.params.robotId },
      { limit, skip: (page - 1) * limit }
    );
    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 }
    });
  } catch (err) {
    handle(res, err);
  }
});

/**
 * @openapi
 * /api/robot/reputation:
 *   get:
 *     tags: [Robot Reputation]
 *     summary: Classifica dei robot per punteggio di reputazione
 *     parameters:
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *       - { in: query, name: badge, schema: { type: string, enum: [Bronze, Silver, Gold, Platinum] } }
 *     responses:
 *       200: { description: Classifica ordinata per punteggio decrescente }
 */
router.get('/reputation', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;
    const badge = req.query.badge || null;
    const data = await reputation.getLeaderboard({ limit, badge });
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    handle(res, err);
  }
});

/**
 * @openapi
 * /api/robot/badges:
 *   get:
 *     tags: [Robot Reputation]
 *     summary: Soglie dei badge (Bronze, Silver, Gold, Platinum)
 *     responses:
 *       200: { description: Elenco dei badge con punteggio e job minimi }
 */
router.get('/badges', (req, res) => {
  res.json({ success: true, data: reputation.BADGES });
});

/**
 * @openapi
 * /api/robot/reputation/{robotId}:
 *   get:
 *     tags: [Robot Reputation]
 *     summary: Reputazione di un robot con badge e progresso
 *     description: >
 *       Il punteggio 0-100 è derivato da valutazioni (60%), esperienza (25%) e
 *       affidabilità (15%). Un robot senza feedback parte da un valore neutro:
 *       non è inaffidabile, è solo sconosciuto.
 *     parameters:
 *       - { in: path, name: robotId, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Punteggio, badge, componenti e progresso verso il badge successivo }
 */
router.get('/reputation/:robotId', async (req, res) => {
  try {
    res.json({ success: true, data: await reputation.getReputation(req.params.robotId) });
  } catch (err) {
    handle(res, err);
  }
});

module.exports = router;
