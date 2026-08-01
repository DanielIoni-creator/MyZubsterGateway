/**
 * @swagger
 * tags:
 *   name: Webhook
 *   description: Webhook verification endpoints
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

/**
 * @swagger
 * /api/webhook/verify:
 *   post:
 *     summary: Verify webhook signature
 *     tags: [Webhook]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               signature:
 *                 type: string
 *               payload:
 *                 type: object
 *     responses:
 *       200:
 *         description: Verification result
 */
router.post('/verify', (req, res) => {
  const { signature, payload } = req.body;
  const expected = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET || 'secret')
    .update(JSON.stringify(payload))
    .digest('hex');
  const valid = signature === expected;
  res.json({ success: true, data: { valid } });
});

/**
 * @swagger
 * /api/webhook/receive:
 *   post:
 *     summary: Receive incoming webhook
 *     tags: [Webhook]
 *     responses:
 *       200:
 *         description: Webhook received
 */
router.post('/receive', (req, res) => {
  res.json({ success: true, message: 'Webhook received' });
});

module.exports = router;
