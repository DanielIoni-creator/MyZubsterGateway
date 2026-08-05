require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
<<<<<<< HEAD
const cors = require('cors');
=======
const { createOrder, onPaymentReceived } = require('./buy_myz');
const { createEscrow, lockFunds, submitProof, release, dispute, getEscrow } = require('./escrow_simulator');
const { mint, balance } = require('./token_simulator');
const { assignReward } = require('./services/rewardService');
const { cacheMiddleware, getStats, del } = require('./services/cacheService');

const { rateLimiter } = require('./middleware/rateLimiter');

>>>>>>> 9182a5dea (feat: Redis Cache distribuita (#281) - cacheService con middleware per rewards, robot, bounty)
const app = express();
const PORT = process.env.PORT || 10000;

// CORS - Permetti richieste dal dominio myzubster.com
app.use(cors({
  origin: ['https://myzubster.com', 'https://www.myzubster.com'],
  credentials: true
}));

// Middleware
app.use(express.json());

// Import routes
const swapRoutes = require('./routes/swap');
const animalRoutes = require('./routes/animals');
const plantRoutes = require('./routes/plants');
const rewardRoutes = require('./routes/rewards');
const contributorsRoutes = require('./routes/contributors');

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Routes API
app.use('/api/swap', swapRoutes);
app.use('/api/animals', animalRoutes);
app.use('/api/plants', plantRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/contributors', contributorsRoutes);

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

// ---- BOUNTY PAGE (DIRECT HTML) ----
app.get('/bounty', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/bounty.html'));
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
const server = app.listen(PORT, () => {
=======
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
app.use('/api/referral', require('./routes/referral'));

app.use('/api/robot', require('./routes/robot'));
app.use('/api/robot/escrow', require('./routes/robotEscrow'));
app.use('/api/robot/logo', require('./routes/robotLogo'));
app.use('/api/robot/code', require('./routes/robotCode'));
app.use('/api/robot/animal', require('./routes/robotAnimal'));

app.use('/api/ratelimit', require('./routes/ratelimit'));
app.use('/api/webhooks', require('./routes/webhook'));

app.use('/api/webhooks/github', require('./routes/githubWebhook'));


// Cache stats (Bounty B16)
app.get('/api/cache/stats', async (req, res) => {
  const stats = await getStats();
  res.json({ success: true, data: stats });
});
app.delete('/api/cache/clear', async (req, res) => {
  const count = await del('*');
  res.json({ success: true, cleared: count });
});

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
>>>>>>> 9182a5dea (feat: Redis Cache distribuita (#281) - cacheService con middleware per rewards, robot, bounty)
  console.log(`🚀 Gateway running on http://localhost:${PORT}`);
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
