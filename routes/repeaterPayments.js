// routes/repeaterPayments.js - Repeater Payment Model x402 - Bounty #789
const express = require('express');
const router = express.Router();
const paymentService = require('../services/repeaterPaymentService');

// Registra nodo per pagamenti
router.post('/register', (req, res) => {
  try {
    const { nodeId, walletAddress, currency } = req.body;
    if (!nodeId || !walletAddress) return res.status(400).json({ error: 'Missing nodeId or walletAddress' });
    const earnings = paymentService.registerForPayments(nodeId, walletAddress, currency || 'MYZ');
    res.json({ success: true, data: earnings });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Calcola pagamento
router.post('/calculate', async (req, res) => {
  try {
    const { nodeId, eventType, metadata } = req.body;
    if (!nodeId || !eventType) return res.status(400).json({ error: 'Missing nodeId or eventType' });
    const payment = await paymentService.calculatePayment(nodeId, eventType, metadata || {});
    res.json({ success: true, data: payment });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Processa payout
router.post('/payout', async (req, res) => {
  try {
    const { nodeId } = req.body;
    if (!nodeId) return res.status(400).json({ error: 'Missing nodeId' });
    const payout = await paymentService.processPayout(nodeId);
    res.json({ success: true, data: payout });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Guadagni nodo
router.get('/earnings/:nodeId', (req, res) => {
  try {
    const earnings = paymentService.getEarnings(req.params.nodeId);
    res.json({ success: true, data: earnings });
  } catch (err) { res.status(404).json({ error: err.message }); }
});

// Dashboard guadagni
router.get('/dashboard', (req, res) => {
  try {
    const dashboard = paymentService.getEarningsDashboard();
    res.json({ success: true, data: dashboard });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Storico pagamenti
router.get('/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = paymentService.getPaymentHistory(limit);
    res.json({ success: true, data: history });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
