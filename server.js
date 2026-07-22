const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const skillRoutes = require('./routes/skills');
const offerRoutes = require('./routes/offers');
const requestRoutes = require('./routes/requests');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const transactionRoutes = require('./routes/transactions');
const reviewRoutes = require('./routes/reviews');
const moneroService = require('./services/moneroService');
const { startMonitoring } = require('./services/paymentMonitor');
const tokenRoutes = require('./routes/tokens');
const marketplaceRoutes = require('./routes/marketplace');
const reputationRoutes = require('./routes/reputation');
const reputationService = require('./services/reputationService');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGODB_URI)
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

app.post('/api/payments/webhook', async (req, res) => {
  res.status(200).json({ received: true });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

app.get('/', (req, res) => {
  res.send('Benvenuto su MyZubsterGateway API. Vai su /api/health per lo stato.');
});

// --- ROUTE MONERO ---
app.post('/api/payments/generate-address', async (req, res) => {
  try {
    const { orderId, label } = req.body;
    const sub = await moneroService.generateSubaddress(label || `order-${orderId || 'test'}`);
    res.json({
      success: true,
      subaddress: sub.address,
      index: sub.index,
      label: sub.label,
    });
  } catch (error) {
    console.error('Errore generazione subaddress:', error);
    res.status(500).json({ error: 'Errore nella generazione del subaddress' });
  }
});

app.get('/api/payments/balance', async (req, res) => {
  try {
    const balance = await moneroService.getBalance();
    res.json({ success: true, balance });
  } catch (error) {
    console.error('Errore recupero saldo:', error);
    res.status(500).json({ error: 'Errore nel recupero del saldo' });
  }
});
// --- FINE ROUTE MONERO ---

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});
