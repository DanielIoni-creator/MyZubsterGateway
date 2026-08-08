const express = require('express');
const mongoose = require('mongoose');
const { WalletService, MemoryLedgerStore, MongoLedgerStore, toCsv } = require('../services/walletService');

const router = express.Router();

// Mongo when the gateway has a live connection, memory otherwise, so the API
// stays usable in local/dev runs without a database.
function buildStore() {
  if (mongoose.connection?.readyState === 1) {
    return new MongoLedgerStore(require('../models/LedgerEntry'));
  }
  return new MemoryLedgerStore();
}

const service = new WalletService({ store: buildStore() });

const fail = (res, error) => {
  const notFound = error.message === 'Transfer not found';
  const conflict = /Insufficient/.test(error.message);
  return res.status(notFound ? 404 : conflict ? 409 : 400).json({ success: false, error: error.message });
};

router.get('/:userId/balance', async (req, res) => {
  try {
    return res.json({ success: true, data: { userId: req.params.userId, balances: await service.balance(req.params.userId) } });
  } catch (error) { return fail(res, error); }
});

router.get('/:userId/transactions', async (req, res) => {
  try {
    const page = await service.transactions({ ...req.query, userId: req.params.userId });
    if (req.query.format === 'csv') {
      res.type('text/csv').attachment(`${req.params.userId}-transactions.csv`);
      return res.send(toCsv(page.items));
    }
    return res.json({ success: true, ...page });
  } catch (error) { return fail(res, error); }
});

router.get('/:userId/history', async (req, res) => {
  try {
    return res.json({ success: true, data: await service.history({ ...req.query, userId: req.params.userId }) });
  } catch (error) { return fail(res, error); }
});

router.post('/transfers', async (req, res) => {
  try {
    const transfer = await service.transfer({ ...req.body, idempotencyKey: req.get('idempotency-key') || req.body.idempotencyKey || null });
    return res.status(201).json({ success: true, data: transfer });
  } catch (error) { return fail(res, error); }
});

router.get('/transfers/:transferId', async (req, res) => {
  try {
    return res.json({ success: true, data: await service.describeTransfer(req.params.transferId) });
  } catch (error) { return fail(res, error); }
});

router.post('/deposits', async (req, res) => {
  try {
    const deposit = await service.deposit({ ...req.body, idempotencyKey: req.get('idempotency-key') || req.body.idempotencyKey || null });
    return res.status(201).json({ success: true, data: deposit });
  } catch (error) { return fail(res, error); }
});

router.post('/withdrawals', async (req, res) => {
  try {
    const withdrawal = await service.withdraw({ ...req.body, idempotencyKey: req.get('idempotency-key') || req.body.idempotencyKey || null });
    return res.status(201).json({ success: true, data: withdrawal });
  } catch (error) { return fail(res, error); }
});

module.exports = router;
module.exports.service = service;
