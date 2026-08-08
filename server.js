require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 10000;
const WS_CORS_ORIGIN = process.env.WS_CORS_ORIGIN || '*';

// HTTP + Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: WS_CORS_ORIGIN, methods: ['GET', 'POST'] }
});

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

// Import routes - UNA SOLA VOLTA
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
const paymentRoutes = require('./routes/payments');
const publicDashboardRoutes = require('./routes/publicDashboard');

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

// Routes API - UNA SOLA VOLTA
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
app.use('/api/payments', paymentRoutes);
app.use('/api/public-dashboard', publicDashboardRoutes);

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

// Use the existing http.Server (created for socket.io) instead of app.listen
// ---- PUBLIC DASHBOARD REAL-TIME METRICS (Bounty #384) ----
// Emette metriche aggregate via Socket.IO a intervalli regolari per
// alimentare la dashboard pubblica in tempo reale.
const { getRobotStats } = require('./services/robotStatsService');

const WS_METRICS_INTERVAL_MS = parseInt(process.env.WS_METRICS_INTERVAL_MS, 10) || 5000;

io.on('connection', (socket) => {
  // Al primo collegamento invia subito un snapshot aggiornato.
  emitPublicMetrics();
  socket.on('public:subscribe', () => emitPublicMetrics());
});

async function emitPublicMetrics() {
  try {
    const stats = await getRobotStats({ refresh: false });
    const payload = {
      totalRobots: stats.totalRobots || 0,
      activeRobots: stats.activeRobots || 0,
      idleRobots: stats.idleRobots || 0,
      disputeRobots: stats.disputeRobots || 0,
      jobsInProgress: stats.jobsInProgress || 0,
      totalJobsCompleted: stats.totalJobsCompleted || 0,
      byStatus: stats.byStatus || { idle: 0, working: 0, delivering: 0, dispute: 0 },
      topRobots: stats.topRobots || [],
      generatedAt: new Date().toISOString()
    };
    io.emit('public:metrics', payload);
  } catch (err) {
    console.error('public dashboard metrics emission failed:', err.message);
  }
}

setInterval(emitPublicMetrics, WS_METRICS_INTERVAL_MS);

server.listen(PORT, () => {
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
