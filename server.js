const express = require('express');
const { limiter, loginLimiter, heavyLimiter } = require("./middleware/rateLimiter");
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Routes
const authRoutes = require('./routes/auth');
const skillRoutes = require('./routes/skills');
const offerRoutes = require('./routes/offers');
const requestRoutes = require('./routes/requests');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const transactionRoutes = require('./routes/transactions');
const reviewRoutes = require('./routes/reviews');
const { startMonitoring } = require('./services/paymentMonitor');
const tokenRoutes = require('./routes/tokens');
const marketplaceRoutes = require('./routes/marketplace');
const aiRoutes = require('./routes/ai');
const escrowRoutes = require('./routes/escrow');
const tariRoutes = require('./routes/tari');
const onionRoutes = require('./routes/onion');
const osintRoutes = require('./routes/osint');
const scannerRoutes = require('./routes/scanner');
const bookingRoutes = require('./routes/bookings');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const daoRoutes = require('./dao/governance');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// ============================================
// RATE LIMITING
// ============================================
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Troppe richieste, riprova tra 15 minuti',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Troppi tentativi di login, riprova tra 15 minuti',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// MIDDLEWARE DI AUTENTICAZIONE JWT
// ============================================
const authenticate = (req, res, next) => {
  const publicRoutes = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify',
    '/api/auth/reset-password'
  ];
  
  if (publicRoutes.includes(req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token richiesto' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token non valido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token scaduto' });
    }
    return res.status(401).json({ error: 'Token non valido' });
  }
};

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use(express.json());
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use(express.urlencoded({ extended: true }));
app.use(limiter);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);

app.use('/api', globalLimiter);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/auth/login', authLimiter);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/auth/register', authLimiter);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);

app.use(express.static('public'));
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);

// ============================================
// DATABASE
// ============================================
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myzubster', {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
  .then(() => console.log('✅ Connesso a MongoDB'))
  .catch(err => console.error('❌ Errore connessione MongoDB:', err));

// ============================================
// ROUTES
// ============================================
// Route pubbliche (senza autenticazione)
app.use('/api/auth', authRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route protette (con autenticazione)
app.use('/api', authenticate);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);

app.use('/api/skills', skillRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/offers', offerRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/requests', requestRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/orders', orderRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/payments', paymentRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/transactions', transactionRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/reviews', reviewRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/tokens', tokenRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/marketplace', marketplaceRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/ai', aiRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/escrow', escrowRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/tari', tariRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/onion', onionRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/osint', osintRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/scanner', scannerRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/bookings', bookingRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/users', userRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/admin', adminRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);
app.use('/api/dao', daoRoutes);
pi/reputation, reputationRoutes);/a app.use("/api/reviews", reviewRoutes);

// ============================================
// START SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Server avviato sulla porta ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  startMonitoring();
});

module.exports = app;
