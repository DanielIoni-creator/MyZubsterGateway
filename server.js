require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
<<<<<<< HEAD
const { createOrder, onPaymentReceived } = require('./buy_myz');
const { createEscrow, lockFunds, submitProof, release, dispute, getEscrow } = require('./escrow_simulator');
const { mint, balance } = require('./token_simulator');
const { assignReward } = require('./services/rewardService');

const { rateLimiter } = require('./middleware/rateLimiter');

=======
const cors = require('cors');
const rateLimit = require('express-rate-limit');
>>>>>>> origin/main
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

<<<<<<< HEAD
// Global rate limiting (Bounty B15)
app.use(rateLimiter({ windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 1000 || 900000, max: parseInt(process.env.RATE_LIMIT_MAX) || 100 }));
=======
// Import routes
const quantumRoutes = require('./quantum/src/api/quantumRoutes');
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
const robotChiesaRoutes = require('./routes/robotChiesa');
const robotMilitareRoutes = require('./routes/robotMilitare');
const evaLunareRoutes = require('./routes/evaLunare');
const baseLunareRoutes = require('./routes/baseLunare');
const stampa3DRoutes = require('./routes/stampa3D');
const estrazioneRisorseRoutes = require('./routes/estrazioneRisorse');
const fabbricaLunareRoutes = require('./routes/fabbricaLunare');
const comunicazioniLunariRoutes = require('./routes/comunicazioniLunari');
const energiaLunareRoutes = require('./routes/energiaLunare');
const cittaLunareRoutes = require('./routes/cittaLunare');
const serreLunariRoutes = require('./routes/serreLunari');
const trasportoLunareRoutes = require('./routes/trasportoLunare');
const evaMarzianoRoutes = require('./routes/evaMarziano');
const baseMarteRoutes = require('./routes/baseMarte');
const energiaMarteRoutes = require('./routes/energiaMarte');
const stampa3DMarteRoutes = require('./routes/stampa3DMarte');
const comunicazioneMarteTerraRoutes = require('./routes/comunicazioneMarteTerra');
const estrazioneAcquaMarteRoutes = require('./routes/estrazioneAcquaMarte');
const fabbricaMarteRoutes = require('./routes/fabbricaMarte');
const trasportoMarteRoutes = require('./routes/trasportoMarte');
const serreMarteRoutes = require('./routes/serreMarte');
const cittaSuMarteRoutes = require('./routes/cittaSuMarte');
>>>>>>> origin/main

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
app.use('/api/quantum', quantumRoutes);
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
app.use('/api/robot-chiesa', robotChiesaRoutes);
app.use('/api/militare', robotMilitareRoutes);
app.use('/api/eva-lunare', evaLunareRoutes);
app.use('/api/base-lunare', baseLunareRoutes);
app.use('/api/stampa-3d', stampa3DRoutes);
app.use('/api/estrazione-risorse', estrazioneRisorseRoutes);
app.use('/api/fabbrica-lunare', fabbricaLunareRoutes);
app.use('/api/comunicazioni-lunari', comunicazioniLunariRoutes);
app.use('/api/energia-lunare', energiaLunareRoutes);
app.use('/api/citta-lunare', cittaLunareRoutes);
app.use('/api/serre-lunari', serreLunariRoutes);
app.use('/api/trasporto-lunare', trasportoLunareRoutes);
app.use('/api/eva-marziano', evaMarzianoRoutes);
app.use('/api/base-marte', baseMarteRoutes);
app.use('/api/energia-marte', energiaMarteRoutes);
app.use('/api/stampa-3d-marte', stampa3DMarteRoutes);
app.use('/api/comunicazione-marte-terra', comunicazioneMarteTerraRoutes);
app.use('/api/estrazione-acqua-marte', estrazioneAcquaMarteRoutes);
app.use('/api/fabbrica-marte', fabbricaMarteRoutes);
app.use('/api/trasporto-marte', trasportoMarteRoutes);
app.use('/api/serre-marte', serreMarteRoutes);
app.use('/api/citta-su-marte', cittaSuMarteRoutes);

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

<<<<<<< HEAD
// ---------- API ROUTES ----------
app.post('/buy-myz', (req, res) => {
  const { userTariWallet, amountMYZ } = req.body;
  const order = createOrder(userTariWallet, amountMYZ);
  onPaymentReceived(order.id, 10);
  res.json({ orderId: order.id, xmrAddress: order.xmrAddress, amountXMR: order.amountXMR, status: 'pending' });
});

app.post('/escrow/create', (req, res) => {
  const { escrowId, buyer, seller, amount } = req.body;
  try {
    const id = createEscrow(escrowId, buyer, seller, amount);
    res.json({ escrowId: id, status: 'created' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/bounty', require('./routes/bounty'));
app.use('/api/stake', require('./routes/stake'));
app.use('/api/escrow/house', require('./routes/escrowHouse'));

app.use('/api/robot', require('./routes/robot'));
app.use('/api/robot/escrow', require('./routes/robotEscrow'));
app.use('/api/robot/logo', require('./routes/robotLogo'));
app.use('/api/robot/code', require('./routes/robotCode'));
app.use('/api/robot/animal', require('./routes/robotAnimal'));

app.use('/api/ratelimit', require('./routes/ratelimit'));

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      telegram: !!process.env.TELEGRAM_BOT_TOKEN,
      github: !!process.env.GITHUB_TOKEN,
      ai: !!process.env.OPENAI_API_KEY
    }
  });
});

// ---------- FRONTEND STATIC SERVING ----------
const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  // Serve static files
  app.use(express.static(frontendDist));

  // SPA fallback: for any request not matching API or static, send index.html
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });

  console.log(`✅ Serving frontend from ${frontendDist}`);
} else {
  console.log('ℹ️ Frontend dist not found. Run "npm run build" in frontend/ first.');
}

// ---------- START SERVER ----------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
=======
const server = app.listen(PORT, () => {
>>>>>>> origin/main
  console.log(`🚀 Gateway running on http://localhost:${PORT}`);
  console.log(`🔒 Security: Rate limiting (100 req/15min), Headers active`);
});
<<<<<<< HEAD
=======

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
>>>>>>> origin/main
