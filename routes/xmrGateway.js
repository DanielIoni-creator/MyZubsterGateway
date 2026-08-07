const express = require('express');
const mongoose = require('mongoose');
const {
  MoneroPaymentGateway,
  MemoryInvoiceStore,
  MongoInvoiceStore,
  SimulatedWalletRpc,
  createWalletRpc,
} = require('../services/moneroGatewayService');

const router = express.Router();

function buildStore() {
  if (mongoose.connection?.readyState === 1) {
    return new MongoInvoiceStore(require('../models/XmrInvoice'));
  }
  return new MemoryInvoiceStore();
}

const simulated = !process.env.MONERO_WALLET_RPC_URL;
const rpc = simulated ? new SimulatedWalletRpc() : createWalletRpc();
const gateway = new MoneroPaymentGateway({ rpc, store: buildStore() });

const fail = (res, error) => {
  const notFound = error.message === 'Invoice not found';
  return res.status(notFound ? 404 : 400).json({ success: false, error: error.message });
};

router.get('/health', async (_req, res) => {
  try { return res.json({ success: true, simulated, data: await gateway.health() }); }
  catch (error) { return res.status(503).json({ success: false, simulated, error: error.message }); }
});

router.post('/invoices', async (req, res) => {
  try { return res.status(201).json({ success: true, simulated, data: await gateway.createInvoice(req.body) }); }
  catch (error) { return fail(res, error); }
});

router.get('/invoices/:orderId', async (req, res) => {
  try { return res.json({ success: true, simulated, data: await gateway.get(req.params.orderId) }); }
  catch (error) { return fail(res, error); }
});

// Re-reads the chain for this invoice. Safe to poll from a pump terminal.
router.post('/invoices/:orderId/check', async (req, res) => {
  try { return res.json({ success: true, simulated, data: await gateway.checkInvoice(req.params.orderId) }); }
  catch (error) { return fail(res, error); }
});

router.post('/sweep', async (_req, res) => {
  try { return res.json({ success: true, simulated, data: await gateway.sweep() }); }
  catch (error) { return fail(res, error); }
});

router.post('/validate-address', async (req, res) => {
  try { return res.json({ success: true, simulated, data: await gateway.validateAddress(req.body?.address) }); }
  catch (error) { return fail(res, error); }
});

router.get('/summary', async (_req, res) => {
  try { return res.json({ success: true, simulated, data: await gateway.summary() }); }
  catch (error) { return fail(res, error); }
});

module.exports = router;
module.exports.gateway = gateway;
