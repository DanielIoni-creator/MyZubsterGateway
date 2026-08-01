const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// Carica le variabili d'ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================

// Sicurezza
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100, // 100 richieste per IP
  message: 'Too many requests, please try again later.'
});
app.use('/api', limiter);

// Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes principali
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const tokenRoutes = require('./routes/tokens');
const moneroRoutes = require('./routes/monero');
const webhookRoutes = require('./routes/webhooks');
const gardenRoutes = require('./routes/garden');

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/monero', moneroRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/garden', gardenRoutes);

// ==================== ERROR HANDLING ====================

// Gestione errori globale
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ==================== DATABASE CONNECTION ====================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// ==================== START SERVER ====================

// Avvia il server solo se non siamo in ambiente di test
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 MyZubster Gateway is running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  });
}

// Esporta app per i test
module.exports = app;
