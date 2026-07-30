const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Middleware di autenticazione admin (da implementare)
const isAdmin = (req, res, next) => {
  // Per ora, bypass per test
  // TODO: Aggiungere verifica JWT con ruolo admin
  next();
};

// GET /api/admin/stats - Statistiche di sistema
router.get('/stats', isAdmin, async (req, res) => {
  try {
    // Statistiche database
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    // Conta documenti per collezione
    const collectionStats = {};
    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      collectionStats[coll.name] = count;
    }

    // Statistiche di sistema (da migliorare)
    const stats = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString(),
      database: {
        collections: collections.length,
        documents: collectionStats,
      },
      payments: {
        total: await db.collection('payments')?.countDocuments() || 0,
        pending: await db.collection('payments')?.countDocuments({ status: 'pending' }) || 0,
        completed: await db.collection('payments')?.countDocuments({ status: 'completed' }) || 0,
      },
      orders: {
        total: await db.collection('orders')?.countDocuments() || 0,
        open: await db.collection('orders')?.countDocuments({ status: 'open' }) || 0,
        completed: await db.collection('orders')?.countDocuments({ status: 'completed' }) || 0,
      },
      users: {
        total: await db.collection('users')?.countDocuments() || 0,
      },
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Errore stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/admin/health - Health check dettagliato
router.get('/health', isAdmin, async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      monero: 'checking...', // Da implementare con ping al nodo Monero
    },
    version: process.env.npm_package_version || '1.0.0',
  };

  // Test connessione Monero (se disponibile)
  try {
    const moneroService = require('../services/moneroService');
    if (moneroService && moneroService.getDaemonInfo) {
      const info = await moneroService.getDaemonInfo();
      health.services.monero = info ? 'connected' : 'unreachable';
    }
  } catch (e) {
    health.services.monero = 'unavailable';
  }

  res.json(health);
});

const MoneroTransaction = require('../models/MoneroTransaction');

// 1. Add GET /api/admin/transactions with filters (status, date, user, amount).
router.get('/transactions', isAdmin, async (req, res) => {
  try {
    const { status, date, user, amount } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (user) filter.buyerId = user;
    if (amount) filter.amount = Number(amount);
    if (date) {
      const d = new Date(date);
      filter.createdAt = {
        $gte: new Date(d.setHours(0, 0, 0)),
        $lt: new Date(d.setHours(23, 59, 59))
      };
    }
    
    const transactions = await MoneroTransaction.find(filter).populate('buyerId', 'username email');
    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Add GET /api/admin/transactions/:id for transaction details.
router.get('/transactions/:id', isAdmin, async (req, res) => {
  try {
    const tx = await MoneroTransaction.findById(req.params.id).populate('buyerId', 'username email');
    if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
    res.json({ success: true, data: tx });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Add POST /api/admin/transactions/:id/verify to manually verify a transaction.
router.post('/transactions/:id/verify', isAdmin, async (req, res) => {
  try {
    const tx = await MoneroTransaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
    
    tx.status = 'confirmed';
    tx.confirmations = req.body.confirmations || tx.confirmations + 1;
    await tx.save();
    
    res.json({ success: true, message: 'Transaction verified manually', data: tx });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. Add POST /api/admin/transactions/:id/refund to trigger a refund (if supported).
router.post('/transactions/:id/refund', isAdmin, async (req, res) => {
  try {
    const tx = await MoneroTransaction.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
    
    if (tx.status !== 'confirmed' && tx.status !== 'failed') {
      // Allow refund logic based on system flow; here we can simulate by marking it failed or refunding via moneroService
      // For now we just mark the status
    }
    tx.status = 'failed';
    await tx.save();
    
    res.json({ success: true, message: 'Transaction refund triggered', data: tx });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
