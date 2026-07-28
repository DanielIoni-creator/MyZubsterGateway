const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const i18nMiddleware = require('./middleware/i18n');

dotenv.config();

const authRoutes = require('./routes/auth');
const skillRoutes = require('./routes/skills');
const offerRoutes = require('./routes/offers');
const requestRoutes = require('./routes/requests');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const transactionRoutes = require('./routes/transactions');
const reviewRoutes = require('./routes/reviews');
const tokenRoutes = require('./routes/tokens');
const marketplaceRoutes = require('./routes/marketplace');
const reputationRoutes = require('./routes/reputation');
const governanceRoutes = require('./routes/governance');
const webhookRoutes = require('./routes/webhooks');
const webhookTestRoutes = require('./routes/webhook');
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

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(i18nMiddleware);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster')
  .then(() => {
    console.log('✅ Connesso a MongoDB');
    startMonitoring();
    reputationService.checkAndMintReputationNFTs();
  })
  .catch(err => console.error('❌ Errore connessione MongoDB:', err));

app.use('/api/auth', authRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/webhook', webhookTestRoutes);

app.post('/api/payments/webhook', async (req, res) => {
  try {
    console.log('📝 Webhook ricevuto:', req.body);
    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: req.t('app.health'),
    language: req.language,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.send('Benvenuto su MyZubsterGateway API. Vai su /api/health per lo stato.');
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

module.exports = app;
