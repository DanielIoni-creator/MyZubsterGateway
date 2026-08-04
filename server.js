require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { createOrder, onPaymentReceived } = require('./buy_myz');
const { createEscrow, lockFunds, submitProof, release, dispute, getEscrow } = require('./escrow_simulator');
const { mint, balance } = require('./token_simulator');
const { assignReward } = require('./services/rewardService');

const app = express();
app.use(express.json());

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
app.use('/api/bounty', require('./routes/bounty'));
app.use('/api/stake', require('./routes/stake'));
app.use('/api/escrow/house', require('./routes/escrowHouse'));

app.use('/api/robot', require('./routes/robot'));
app.use('/api/robot/escrow', require('./routes/robotEscrow'));
app.use('/api/robot/logo', require('./routes/robotLogo'));
app.use('/api/robot/code', require('./routes/robotCode'));
app.use('/api/robot/animal', require('./routes/robotAnimal'));

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


const Robot = require('./models/Robot');
const CodeJob = require('./models/CodeJob');
let recentEvents = [];

// Helper to log events for the status page
global.logEvent = (msg) => {
  recentEvents.unshift({ timestamp: new Date(), message: msg });
  if (recentEvents.length > 10) recentEvents.pop();
};

app.get('/api/status', async (req, res) => {
  try {
    const robots = await Robot.countDocuments({ status: 'active' });
    const jobs = await CodeJob.countDocuments({ status: 'in-progress' });
    res.json({
      uptime: process.uptime(),
      activeRobots: robots,
      ongoingJobs: jobs,
      events: recentEvents
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/status', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Gateway Status</title>
  <style>body { font-family: sans-serif; padding: 2rem; } .card { border: 1px solid #ccc; padding: 1rem; margin-bottom: 1rem; }</style>
</head>
<body>
  <h1>MyZubster Gateway Status</h1>
  <div class="card">
    <p><strong>Uptime:</strong> <span id="uptime">Loading...</span></p>
    <p><strong>Active Robots:</strong> <span id="robots">Loading...</span></p>
    <p><strong>Ongoing Jobs:</strong> <span id="jobs">Loading...</span></p>
  </div>
  <h2>Recent Events</h2>
  <ul id="events"></ul>

  <script>
    async function update() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const hrs = Math.floor(data.uptime / 3600);
        const mins = Math.floor((data.uptime % 3600) / 60);
        document.getElementById('uptime').innerText = hrs + 'h ' + mins + 'm';
        document.getElementById('robots').innerText = data.activeRobots;
        document.getElementById('jobs').innerText = data.ongoingJobs;
        
        const evList = document.getElementById('events');
        evList.innerHTML = '';
        data.events.forEach(e => {
          const li = document.createElement('li');
          li.innerText = new Date(e.timestamp).toLocaleTimeString() + ' - ' + e.message;
          evList.appendChild(li);
        });
      } catch (e) {
        console.error(e);
      }
    }
    update();
    setInterval(update, 10000);
  </script>
</body>
</html>
  `);
});

// ---------- FRONTEND STATIC SERVING ----------
const frontendDist = path.join(__dirname, 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
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

// ---------- START SERVER WITH GRACEFUL SHUTDOWN ----------
const PORT = process.env.PORT || 10000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Gateway running on http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM ricevuto, chiusura graceful...');
  server.close(() => {
    console.log('✅ Server chiuso');
    process.exit(0);
  });
});
