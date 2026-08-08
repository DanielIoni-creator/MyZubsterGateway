const express = require('express');
const router = express.Router();
const { QuantumWallet } = require('../crypto/quantumWallet');
const { QuantumKeyDistribution } = require('../protocols/qkd');

const quantumWallets = new Map();

router.post('/wallet/create', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (quantumWallets.has(userId)) {
      return res.status(409).json({ error: 'Wallet già esistente' });
    }
    const wallet = new QuantumWallet(userId);
    wallet.generateQuantumAddress();
    quantumWallets.set(userId, wallet);
    res.json({ success: true, wallet: wallet.getBalance() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/wallet/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    if (!quantumWallets.has(userId)) {
      return res.status(404).json({ error: 'Wallet non trovato' });
    }
    const wallet = quantumWallets.get(userId);
    res.json({ success: true, wallet: wallet.getBalance() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transaction', (req, res) => {
  try {
    const { from, to, amount, message } = req.body;
    if (!quantumWallets.has(from)) {
      return res.status(404).json({ error: 'Wallet mittente non trovato' });
    }
    const wallet = quantumWallets.get(from);
    const transaction = wallet.quantumTransaction(to, amount, message);
    res.json({ success: true, transaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/qkd/execute', (req, res) => {
  try {
    const { length = 256 } = req.body;
    const qkd = new QuantumKeyDistribution();
    const result = qkd.executeProtocol(length);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify/:transactionId', (req, res) => {
  try {
    const { transactionId } = req.params;
    const { userId } = req.body;
    if (!quantumWallets.has(userId)) {
      return res.status(404).json({ error: 'Wallet non trovato' });
    }
    const wallet = quantumWallets.get(userId);
    const transaction = wallet.transactions.find(t => t.id === transactionId);
    if (!transaction) {
      return res.status(404).json({ error: 'Transazione non trovata' });
    }
    const verified = wallet.verifyTransaction(transaction);
    res.json({ success: true, verified, transaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', (req, res) => {
  try {
    const totalWallets = quantumWallets.size;
    const totalTransactions = Array.from(quantumWallets.values())
      .reduce((sum, w) => sum + w.transactions.length, 0);
    const totalVolume = Array.from(quantumWallets.values())
      .reduce((sum, w) => sum + w.transactions.reduce((s, t) => s + t.amount, 0), 0);
    res.json({ success: true, stats: { totalWallets, totalTransactions, totalVolume, quantumEnabled: true } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
