/**
 * @swagger
 * tags:
 *   name: Webhook
 *   description: Webhook verification endpoints
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const WebhookService = require('../services/webhookService');

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

/**
 * @swagger
 * /api/webhook/delivery:
 *   post:
 *     summary: Receive an AI-verification delivery webhook
 *     tags: [Webhook]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventType:
 *                 type: string
 *               orderId:
 *                 type: string
 *               escrowId:
 *                 type: string
 *               sellerId:
 *                 type: string
 *               status:
 *                 type: string
 *               proof:
 *                 type: object
 *     responses:
 *       201:
 *         description: Delivery webhook accepted and verified
 *       400:
 *         description: Invalid payload (missing orderId/escrowId)
 *       401:
 *         description: Invalid signature
 */
router.post('/delivery', async (req, res) => {
  try {
    const result = await WebhookService.recordDeliveryWebhook({
      payload: req.body,
      signatureHeader: req.headers['x-webhook-signature'],
      source: 'seller'
    });
    res.status(201).json({
      success: true,
      data: result,
      status: result.status === 'verified' ? 'verified' : 'received'
    });
  } catch (error) {
    if (error instanceof WebhookService.WebhookValidationError) {
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message,
        data: error.log || null
      });
    } else {
      console.error('Delivery webhook error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

/**
 * @swagger
 * /api/webhook/test-webhook:
 *   post:
 *     summary: Send a test webhook delivery
 *     tags: [Webhook]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetUrl:
 *                 type: string
 *               payload:
 *                 type: object
 *     responses:
 *       200:
 *         description: Test webhook sent
 *       400:
 *         description: Missing targetUrl
 */
router.post('/test-webhook', async (req, res) => {
  const { targetUrl, payload } = req.body;
  if (!targetUrl) {
    const message = typeof req.t === 'function'
      ? req.t('validation.targetUrlRequired')
      : 'targetUrl is required';
    return res.status(400).json({ error: message });
  }
  try {
    const result = await WebhookService.sendWebhookAsync(targetUrl, payload || {});
    const message = typeof req.t === 'function'
      ? req.t('webhooks.sentWithRetry')
      : 'Webhook sent with automatic retry';
    res.json({ success: true, result, message });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = router;
