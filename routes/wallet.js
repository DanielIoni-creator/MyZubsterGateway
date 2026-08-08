const express = require('express');
const router = express.Router();
const WalletService = require('../services/walletService');

const walletService = new WalletService();

// GET /api/wallet/:userId/balance — Saldo utente
router.get('/:userId/balance', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await walletService.getBalance(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/wallet/balances — Tutti i saldi (admin)
router.get('/balances', async (req, res) => {
  try {
    const result = await walletService.getAllBalances();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/wallet/deposit — Deposito fondi
router.post('/deposit', async (req, res) => {
  try {
    const { userId, amount, currency } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ success: false, error: 'userId and amount are required' });
    }
    const result = await walletService.deposit(userId, amount, currency || 'MYZ');
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/wallet/withdraw — Prelievo fondi
router.post('/withdraw', async (req, res) => {
  try {
    const { userId, amount, currency, destination } = req.body;
    if (!userId || !amount) {
      return res.status(400).json({ success: false, error: 'userId and amount are required' });
    }
    const result = await walletService.withdraw(userId, amount, currency || 'MYZ', destination);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/wallet/transfer — Trasferimento tra utenti
router.post('/transfer', async (req, res) => {
  try {
    const { fromUserId, toUserId, amount, currency } = req.body;
    if (!fromUserId || !toUserId || !amount) {
      return res.status(400).json({ success: false, error: 'fromUserId, toUserId, and amount are required' });
    }
    const result = await walletService.transfer(fromUserId, toUserId, amount, currency || 'MYZ');
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/wallet/:userId/transactions — Lista transazioni
router.get('/:userId/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const currency = req.query.currency || null;
    const result = await walletService.getTransactions(userId, limit, offset, currency);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/wallet/:userId/history — Storico movimenti (time-bucketed)
router.get('/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const period = req.query.period || 'daily';
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const result = await walletService.getHistory(userId, period, startDate, endDate);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/wallet/:userId/summary — Riepilogo completo wallet
router.get('/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await walletService.getSummary(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
