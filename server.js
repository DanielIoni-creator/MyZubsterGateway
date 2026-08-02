const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://myzubster-mongodb:27017/myzubster';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ---- Auth ----
app.use('/api/auth', require('./routes/authRoutes'));

// ---- Animals ----
app.use('/api/animals', require('./routes/animalRoutes'));

// ---- Plants ----
app.use('/api/plants', require('./routes/plantRoutes'));

// ---- Bounties (new bounty system) ----
app.use('/api/bounties', require('./routes/bountyRoutes'));

// ---- Bounties (webhook / status / update — legacy) ----
app.use('/api/bounties', require('./routes/bounties'));

// ---- Rewards ----
app.use('/api/rewards', require('./routes/rewardRoutes'));

// ---- Webhooks ----
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/webhook', require('./routes/webhook'));

// ---- Monero ----
app.use('/api/monero', require('./routes/monero'));

// ---- Payments ----
app.use('/api/payments', require('./routes/payments'));

// ---- Robot ----
app.use('/api/robot', require('./routes/robot'));

// ---- Marketplace ----
app.use('/api/marketplace', require('./routes/marketplace'));

// ---- Referral ----
app.use('/api/referral', require('./routes/referral'));

// ---- Escrow ----
app.use('/api/escrow', require('./routes/escrow'));

// ---- Bookings ----
app.use('/api/bookings', require('./routes/bookings'));

// ---- Health check ----
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// ---- Info endpoint ----
app.get('/api/info', (req, res) => {
  res.json({
    name: 'MyZubster Gateway',
    version: '1.0.0',
    description: 'Monero Payment Gateway & Animal Registry',
    features: {
      payments: process.env.ENABLE_PAYMENTS === 'true',
      animals: process.env.ENABLE_ANIMAL_REGISTRY === 'true',
      plants: process.env.ENABLE_PLANT_REGISTRY === 'true',
      bounty: process.env.ENABLE_BOUNTY_PROGRAM === 'true',
      rewards: true
    },
    monero_wallet: process.env.MONERO_MAIN_WALLET_ADDRESS
  });
});

// ---- Root endpoint ----
app.get('/', (req, res) => {
  res.json({
    name: 'MyZubster Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      info: '/api/info',
      auth: {
        register: '/api/auth/register',
        login: '/api/auth/login',
        profile: '/api/auth/profile'
      },
      animals: {
        list: '/api/animals',
        register: '/api/animals/register',
        detail: '/api/animals/:id'
      },
      plants: {
        list: '/api/plants',
        register: '/api/plants/register',
        detail: '/api/plants/:id'
      },
      bounties: {
        list: '/api/bounties',
        create: '/api/bounties/create',
        claim: '/api/bounties/:id/claim',
        stats: '/api/bounties/stats',
        webhook: '/api/bounties/webhook',
        status: '/api/bounties/status/:issueNumber'
      },
      rewards: {
        list: '/api/rewards',
        stats: '/api/rewards/stats',
        claim: '/api/rewards/claim/:rewardId'
      },
      monero: '/api/monero',
      payments: '/api/payments',
      robot: '/api/robot',
      marketplace: '/api/marketplace',
      referral: '/api/referral',
      escrow: '/api/escrow',
      bookings: '/api/bookings'
    }
  });
});

// ---- 404 handler ----
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} does not exist`
  });
});

// ---- Error handler ----
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// ---- Telegram Bot ----
const MyZubsterBot = require('./services/telegram-bot');
if (process.env.TELEGRAM_BOT_TOKEN && require.main === module) {
  const bot = new MyZubsterBot(process.env.TELEGRAM_BOT_TOKEN);
  console.log('✅ Telegram Bot avviato!');
}

// ---- Start server (only when run directly; export app for tests) ----
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 MyZubster Gateway is running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📋 Info: http://localhost:${PORT}/api/info`);
    console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/register`);
    console.log(`🐾 Animals: http://localhost:${PORT}/api/animals`);
    console.log(`🌿 Plants: http://localhost:${PORT}/api/plants`);
    console.log(`🏆 Bounties: http://localhost:${PORT}/api/bounties`);
    console.log(`💰 Rewards: http://localhost:${PORT}/api/rewards`);
  });

  // ---- Graceful shutdown ----
  process.on('SIGTERM', () => {
    console.log('📡 SIGTERM received, closing server...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}

module.exports = app;
