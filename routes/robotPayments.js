const express = require('express');
const {
  MemoryPaymentStore,
  RobotPaymentService,
  createRpcWalletAdapter,
  verifyWebhookSignature,
} = require('../services/robotPaymentService');

const router = express.Router();
const store = new MemoryPaymentStore();
const adapters = {};
if (process.env.TARI_WALLET_URL) adapters.MYZ = createRpcWalletAdapter({ asset: 'MYZ', baseUrl: process.env.TARI_WALLET_URL, token: process.env.TARI_WALLET_TOKEN });
if (process.env.MONERO_WALLET_URL) adapters.XMR = createRpcWalletAdapter({ asset: 'XMR', baseUrl: process.env.MONERO_WALLET_URL, token: process.env.MONERO_WALLET_TOKEN });
const service = new RobotPaymentService({ adapters, store });

function handle(res, action, successStatus = 200) {
  return action.then((data) => res.status(successStatus).json({ success: true, data })).catch((error) => {
    const status = error.message === 'Payment not found' ? 404 : 400;
    return res.status(status).json({ success: false, error: error.message });
  });
}

router.post('/', (req, res) => handle(res, service.createPayment(req.body), 201));
router.get('/', (_req, res) => handle(res, store.list()));
router.get('/:id', (req, res) => handle(res, service.requirePayment(req.params.id)));
router.post('/:id/release', (req, res) => handle(res, service.release(req.params.id)));
router.post('/:id/dispute', (req, res) => handle(res, service.dispute(req.params.id, req.body.reason)));
router.post('/:id/refund', (req, res) => handle(res, service.refund(req.params.id, req.body.reason)));

router.post('/webhooks/:asset', (req, res) => {
  const asset = req.params.asset.toUpperCase();
  const secret = process.env[`${asset}_WEBHOOK_SECRET`];
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
  if (!verifyWebhookSignature(rawBody, req.get('x-webhook-signature'), secret)) {
    return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
  }
  const payload = JSON.parse(rawBody.toString('utf8'));
  return handle(res, service.recordConfirmation(payload));
});

module.exports = router;
module.exports.service = service;
