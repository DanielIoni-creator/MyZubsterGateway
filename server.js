require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { createOrder, onPaymentReceived } = require('./buy_myz');
const { createEscrow, lockFunds, submitProof, release, dispute, getEscrow } = require('./escrow_simulator');
const { mint, balance } = require('./token_simulator');
const { assignReward } = require('./services/rewardService');
const { webhookHandler } = require('./routes/webhook');

const { rateLimiter } = require('./middleware/rateLimiter');

const app = express();

// Raw body parser for GitHub webhook signature verification
app.use('/api/webhooks/github', express.raw({ type: 'application/json' }), (req, res, next) => {
  webhookHandler(req, res);
});

// JSON body parser for all other routes
app.use(express.json());

// Global rate limiting (Bounty B15)
app.use(rateLimiter({ windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 1000 || 900000, max: parseInt(process.env.RATE_LIMIT_MAX) || 100 }));

// Per-endpoint rate limiting for sensitive routes
const sensitiveLimiter = rateLimiter({ windowMs: 60000, max: 30, keyBy: "ip+endpoint" });
app.use("/api/rewards/trigger", sensitiveLimiter);
app.use("/api/bounty/create", sensitiveLimiter);
app.use("/api/escrow/create", sensitiveLimiter);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

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
app.use('/api/robot', require('./routes/robot'));
app.use('/api/robot/escrow', require('./routes/robotEscrow'));
app.use('/api/bounty', require('./routes/bounty'));
app.use('/api/stake', require('./routes/stake'));
app.use('/api/escrow/house', require('./routes/escrowHouse'));

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.1.0'
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
  console.log(`🚀 Gateway running on http://localhost:${PORT}`);
  console.log(`📡 Webhook endpoint: POST /api/webhooks/github`);
});
