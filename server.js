const express = require('express');
const mongoose = require('mongoose');
const { createOrder, onPaymentReceived } = require('./buy_myz');
const { createEscrow, lockFunds, submitProof, release, dispute, getEscrow } = require('./escrow_simulator');
const { mint, balance } = require('./token_simulator');
const { assignReward } = require('./services/rewardService');

const app = express();
app.use(express.json());
app.use(express.static('.'));
app.use(express.static('public'));

const SERVER_START_TIME = Date.now();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myzubster')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

app.post('/buy-myz', (req, res) => {
  const { userTariWallet, amountMYZ } = req.body;
  const order = createOrder(userTariWallet, amountMYZ);
  onPaymentReceived(order.id, 10);
  res.json({
    orderId: order.id,
    xmrAddress: order.xmrAddress,
    amountXMR: order.amountXMR,
    status: 'pending'
  });
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
app.use('/api/robot', require('./routes/robot'));
app.use('/api/bounty', require('./routes/bounty'));
app.use('/api/stake', require('./routes/stake'));
app.use('/api/escrow/house', require('./routes/escrowHouse'));
app.use('/api/robot/escrow', require('./routes/robotEscrow'));
app.use('/api/robot', require('./routes/robot'));

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'MyZubster Gateway is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// GET /api/status — Gateway status info for the status page
app.get('/api/status', (req, res) => {
  const robotBrain = require('./robot_brain');
  const robots = robotBrain.getAllRobots();
  const events = robotBrain.getAllEvents(10);
  
  const uptime = Date.now() - SERVER_START_TIME;
  const activeRobots = robots.filter(r => r.status !== 'idle').length;
  const currentJobs = robots.filter(r => r.currentJob !== null).length;
  
  res.json({
    success: true,
    data: {
      uptime,
      uptimeHuman: formatUptime(uptime),
      totalRobots: robots.length,
      activeRobots,
      idleRobots: robots.length - activeRobots,
      currentJobs,
      robotsByStatus: {
        idle: robots.filter(r => r.status === 'idle').length,
        working: robots.filter(r => r.status === 'working').length,
        delivering: robots.filter(r => r.status === 'delivering').length,
        dispute: robots.filter(r => r.status === 'dispute').length
      },
      recentEvents: events,
      serverTime: new Date().toISOString()
    }
  });
});

function formatUptime(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hrs = Math.floor(min / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ${hrs % 24}h ${min % 60}m`;
  if (hrs > 0) return `${hrs}h ${min % 60}m ${sec % 60}s`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Gateway running on http://localhost:${PORT}`);
});
