const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://myzubster-mongodb:27017/myzubster';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ---- Monero Routes ----
const moneroRoutes = require('./routes/monero');
app.use('/api/monero', moneroRoutes);

// ---- Payment Routes ----
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

// ---- Robot Routes ----
const robotRoutes = require('./routes/robot');
const marketplaceRoutes = require('./routes/marketplace');
app.use('/api/robot', robotRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// ---- Bounty Routes ----
const bountyRoutes = require('./routes/bounties');
app.use('/api/bounties', bountyRoutes);

// ---- Referral Routes ----
const referralRoutes = require('./routes/referral');
app.use('/api/referral', referralRoutes);

// ---- Escrow Routes ----
const escrowRoutes = require('./routes/escrow');
app.use('/api/escrow', escrowRoutes);

app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    name: 'MyZubster Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      monero: '/api/monero',
      payments: '/api/payments',
      robot: '/api/robot',
      bounties: '/api/bounties',
      referral: '/api/referral',
      escrow: '/api/escrow'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ---- Telegram Bot ----
const MyZubsterBot = require('./services/telegram-bot');
if (process.env.TELEGRAM_BOT_TOKEN) {
  const bot = new MyZubsterBot(process.env.TELEGRAM_BOT_TOKEN);
  console.log('✅ Telegram Bot avviato!');
}
