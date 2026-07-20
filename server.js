// server.js - MyZubster Gateway
// Backend principale per la piattaforma MyZubster

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Carica le variabili d'ambiente
dotenv.config();

// Inizializza Express
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// IMPORT MODELLI
// ============================================
require('./models/User');
require('./models/Order');
require('./models/Skill');
require('./models/Offer');
require('./models/Request');
require('./models/Transaction');
require('./models/Review');

// ============================================
// IMPORT ROUTE
// ============================================
const authRoutes = require('./routes/auth');
const skillRoutes = require('./routes/skills');
const offerRoutes = require('./routes/offers');
const requestRoutes = require('./routes/requests');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const transactionRoutes = require('./routes/transactions');
const reviewRoutes = require('./routes/reviews');

// ============================================
// ROTTE API
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reviews', reviewRoutes);

// ============================================
// WEBHOOK PER PAGAMENTI (MOCK)
// ============================================
app.post('/api/payments/webhook', async (req, res) => {
  try {
    console.log('📝 Webhook ricevuto:', req.body);
    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ROTTA DI TEST
// ============================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MyZubster Gateway is running!',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ============================================
// CONNESSIONE AL DATABASE
// ============================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connesso a MongoDB');
    console.log(`📦 Database: ${MONGODB_URI}`);
  })
  .catch((err) => {
    console.error('❌ Errore connessione MongoDB:', err);
    process.exit(1);
  });

// ============================================
// AVVIO DEL SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});

// Gestione errori non catturati
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

module.exports = app;
