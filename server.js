require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const i18nMiddleware = require('./middleware/i18n');

const authRoutes = require('./routes/auth');
const skillRoutes = require('./routes/skills');
const offerRoutes = require('./routes/offers');
const requestRoutes = require('./routes/requests');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const transactionRoutes = require('./routes/transactions');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');
const tokenRoutes = require('./routes/tokens');
const marketplaceRoutes = require('./routes/marketplace');
const reputationRoutes = require('./routes/reputation');
const governanceRoutes = require('./routes/governance');
const webhookRoutes = require('./routes/webhooks');
const { startMonitoring } = require('./services/paymentMonitor');
const reputationService = require('./services/reputationService');

require('./models/User');
require('./models/Order');
require('./models/Skill');
require('./models/Offer');
require('./models/Request');
require('./models/Transaction');
require('./models/Review');
require('./models/Webhook');
require('./models/WebhookDelivery');
require('./models/EncryptedOrder');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(i18nMiddleware);

app.get('/', (req, res) => {
  res.json({
    name: 'MyZubster Gateway',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      orders: '/api/orders',
      payments: '/api/payments',
      users: '/api/users',
      offers: '/api/offers',
      skills: '/api/skills',
      webhooks: '/api/webhooks'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: req.t('app.health'),
    language: req.language,
    timestamp: new Date().toISOString(),
    service: 'MyZubster Gateway',
    version: '1.0.0',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/webhooks', webhookRoutes);

app.post('/api/payments/webhook', async (req, res) => {
  try {
    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster')
  .then(() => {
    if (process.env.NODE_ENV !== 'test') {
      startMonitoring();
      reputationService.checkAndMintReputationNFTs();
    }
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  });

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

module.exports = app;
