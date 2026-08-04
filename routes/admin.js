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

module.exports = router;
