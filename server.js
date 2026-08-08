const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;

// ---- GIN GUARDIAN SECURITY ----
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: '⚠️ Troppe richieste, riprova più tardi.',
  standardHeaders: true,
  legacyHeaders: false
});

// CORS
app.use(cors({
  origin: ['https://myzubster.com', 'https://www.myzubster.com'],
  credentials: true
}));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json());
app.use(limiter);

// Import routes
const robotMilitareRoutes = require('./routes/robotMilitare');
const robotChiesaRoutes = require('./routes/robotChiesa');
const centroControlloRoutes = require('./routes/centroControllo');
const navicellaRoutes = require('./routes/navicella');
const stazioneRoutes = require('./routes/stazione');
const autoRoutes = require('./routes/auto');
const walletRoutes = require('./src/routes/walletRoutes');
const swapRoutes = require('./routes/swap');
const animalRoutes = require('./routes/animals');
const plantRoutes = require('./routes/plants');
const rewardRoutes = require('./routes/rewards');
const contributorsRoutes = require('./routes/contributors');
const marketingTemplateRoutes = require('./routes/marketingTemplates');
const sensorRoutes = require('./routes/sensors');
const securityRoutes = require('./routes/security');
const xmrRoutes = require('./routes/xmr');
const gl1BridgeRoutes = require('./routes/gl1Bridge');
const disputeRoutes = require('./routes/disputes');
const paymentRoutes = require('./routes/payments');
const escrowRoutes = require('./src/routes/escrowRoutes');
const multiCurrencyEscrowRoutes = require('./src/routes/multiCurrencyEscrowRoutes');
const verificationRoutes = require('./routes/verification');
const seedExchangeRoutes = require('./routes/seedExchange');

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    rateLimit: '100 requests per 15 minutes'
  });
});

// Routes API
app.use('/api/militare', robotMilitareRoutes);
app.use('/api/robot-chiesa', robotChiesaRoutes);
app.use('/api/centri-controllo', centroControlloRoutes);
app.use('/api/navicelle', navicellaRoutes);
app.use('/api/stazioni', stazioneRoutes);
app.use('/api/auto', autoRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/swap', swapRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/contributors', contributorsRoutes);
app.use('/api/marketing-templates', marketingTemplateRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/xmr', xmrRoutes);
app.use('/api/gl1', gl1BridgeRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/multi-currency-escrow', multiCurrencyEscrowRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/seed-exchange', seedExchangeRoutes);

// Robot routes
try {
  const robotRoutes = require('./routes/robot');
  app.use('/api/robot', robotRoutes);
  console.log('✅ Caricamento routes robot...');
} catch (err) {
  console.error('❌ Errore caricamento robot:', err.message);
}

// Logo routes
try {
  const logoRoutes = require('./routes/robotLogo');
  app.use('/api/robot/logo', logoRoutes);
  console.log('✅ Caricamento routes logo...');
} catch (err) {
  console.error('❌ Errore caricamento logo:', err.message);
}

// ---- STATIC PAGES ----
app.get('/bounty', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/bounty.html'));
});

app.get('/garden', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/garden.html'));
});

app.get('/wallet-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/wallet-dashboard.html'));
});

app.get('/hospital', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/hospital.html'));
});

// Static frontend
const frontendPath = path.join(__dirname, 'frontend/dist');
app.use(express.static(frontendPath));

// SPA fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handler per 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const server = app.listen(PORT, () => {
  console.log(`🚀 Gateway running on http://localhost:${PORT}`);
  console.log(`🔒 Security: Rate limiting (100 req/15min), Headers active`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM ricevuto, chiusura graceful...');
  server.close(() => {
    mongoose.connection.close()
      .then(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
      })
      .catch(err => {
        console.error('❌ Errore chiusura MongoDB:', err);
        process.exit(1);
      });
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT ricevuto, chiusura graceful...');
  server.close(() => {
    mongoose.connection.close()
      .then(() => {
        console.log('✅ Server chiuso');
        process.exit(0);
      })
      .catch(err => {
        console.error('❌ Errore chiusura MongoDB:', err);
        process.exit(1);
      });
  });
});
