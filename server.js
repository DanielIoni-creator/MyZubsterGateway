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
/* replaced with http server */
//const server = app.listen(PORT, () => {
*/
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 10000;
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Emit metrics periodically
setInterval(async () => {
  try {
    const activeRobots = await require('./models/Robot').countDocuments({ status: 'active' });
    io.emit('metrics', { activeRobots, tokensSpent: Math.floor(Math.random() * 5000), commissions: Math.floor(Math.random() * 200) });
  } catch(e) {}
}, 5000);

app.get('/public-dashboard', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Public Dashboard</title>
  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: Arial; padding: 20px; background: #f4f4f9; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; display: inline-block; width: 30%; text-align: center; }
    .container { display: flex; justify-content: space-between; }
    canvas { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <h1>MyZubster Live Dashboard</h1>
  <div class="container">
    <div class="card"><h3>Active Robots</h3><h2 id="r-count">0</h2></div>
    <div class="card"><h3>Tokens Spent</h3><h2 id="t-spent">0</h2></div>
    <div class="card"><h3>Commissions</h3><h2 id="c-gen">0</h2></div>
  </div>
  <canvas id="myChart" width="400" height="150"></canvas>
  <script>
    const ctx = document.getElementById('myChart').getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Active Robots', data: [], borderColor: '#3b82f6', tension: 0.1 }] }
    });
    const socket = io();
    socket.on('metrics', (data) => {
      document.getElementById('r-count').innerText = data.activeRobots;
      document.getElementById('t-spent').innerText = data.tokensSpent;
      document.getElementById('c-gen').innerText = data.commissions;
      
      const time = new Date().toLocaleTimeString();
      chart.data.labels.push(time);
      chart.data.datasets[0].data.push(data.activeRobots);
      if (chart.data.labels.length > 20) { chart.data.labels.shift(); chart.data.datasets[0].data.shift(); }
      chart.update();
    });
  </script>
</body>
</html>
  `);
});

server.listen(PORT, () => {
  console.log(`🚀 Gateway running on http://localhost:${PORT}`);
});


process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM ricevuto, chiusura graceful...');
  server.close(() => {
    console.log('✅ Server chiuso');
    process.exit(0);
  });
});
