// routes/payments.js - Sistema pagamenti MYZ/XMR (Bounty #382)
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const processor = require('../gateway/payment_processor');

// POST /api/payments/address - Genera indirizzo di pagamento
router.post('/address', async (req, res) => {
  try {
    const { currency, amount, clientId, robotId, escrowId } = req.body;
    if (!currency || !amount) {
      return res.status(400).json({ error: 'currency e amount richiesti' });
    }
    if (!['MYZ','XMR'].includes(currency)) {
      return res.status(400).json({ error: 'currency deve essere MYZ o XMR' });
    }
    const result = processor.generatePaymentAddress(currency, { clientId, robotId, amount, escrowId });
    
    // Salva transazione nel DB
    const tx = new Transaction({
      paymentId: result.paymentId,
      paymentAddress: result.address,
      amount, currency,
      type: 'pagamento',
      status: 'pending',
      clientId, robotId,
      escrowId
    });
    await tx.save();
    
    res.json({ success: true, data: { ...result, dbId: tx._id } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/webhook - Conferma pagamento (webhook simulato)
router.post('/webhook', async (req, res) => {
  try {
    const { paymentId, amount, txHash } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'paymentId richiesto' });
    
    // Simula ricezione pagamento
    const result = processor.simulatePaymentReceived(paymentId, amount || 0);
    
    // Aggiorna transazione nel DB
    await Transaction.findOneAndUpdate(
      { paymentId },
      { 
        status: 'confirmed',
        transactionHash: txHash || result.txHash,
        confirmedAt: new Date(),
        confirmations: 3
      }
    );
    
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/escrow/lock - Blocca fondi in escrow
router.post('/escrow/lock', async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'paymentId richiesto' });
    const result = processor.lockInEscrow(paymentId);
    await Transaction.findOneAndUpdate({ paymentId }, { status: 'in_escrow' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/escrow/release - Rilascia fondi dall'escrow
router.post('/escrow/release', async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'paymentId richiesto' });
    const result = processor.releaseFromEscrow(paymentId);
    await Transaction.findOneAndUpdate({ paymentId }, { status: 'released' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/refund - Rimborso
router.post('/refund', async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;
    if (!paymentId) return res.status(400).json({ error: 'paymentId richiesto' });
    const result = processor.refundPayment(paymentId, amount || null);
    await Transaction.findOneAndUpdate(
      { paymentId },
      { 
        status: 'refunded',
        refundAmount: result.refundedAmount,
        refundTxid: result.refundTx,
        refundedAt: new Date(),
        disputeReason: reason || null
      }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/:paymentId - Stato pagamento
router.get('/:paymentId', async (req, res) => {
  try {
    const status = processor.getPaymentStatus(req.params.paymentId);
    if (!status) return res.status(404).json({ error: 'Pagamento non trovato' });
    const tx = await Transaction.findOne({ paymentId: req.params.paymentId });
    res.json({ success: true, data: { ...status, dbRecord: tx } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments - Lista pagamenti
router.get('/', async (req, res) => {
  try {
    const { status, currency, clientId, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (currency) filter.currency = currency;
    if (clientId) filter.clientId = clientId;
    const txs = await Transaction.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
    const livePayments = processor.listAllPayments();
    res.json({ success: true, count: txs.length, data: txs, live: livePayments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/dashboard - Dashboard transazioni
router.get('/dashboard/summary', async (req, res) => {
  try {
    const [totale, perValuta, perStato, recenti] = await Promise.all([
      Transaction.aggregate([{ : { _id: null, totale: { : '' }, count: { : 1 } } }]),
      Transaction.aggregate([{ : { _id: '', totale: { : '' }, count: { : 1 } } }]),
      Transaction.aggregate([{ : { _id: '', count: { : 1 } } }]),
      Transaction.find().sort({ createdAt: -1 }).limit(10)
    ]);
    res.json({ 
      success: true, 
      data: { 
        totale: totale[0] || { totale: 0, count: 0 },
        perValuta, perStato, recenti,
        liveWallets: processor.listAllPayments().length
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
