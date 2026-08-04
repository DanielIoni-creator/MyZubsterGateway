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

// GET /api/monitoring/stats — Aggregated stats for the monitoring dashboard
app.get('/api/monitoring/stats', (req, res) => {
  const robotBrain = require('./robot_brain');
  const escrowRobot = require('./escrow_robot');
  const robots = robotBrain.getAllRobots();
  const events = robotBrain.getAllEvents(200);
  const escrows = escrowRobot.getAllEscrows();

  const now = Date.now();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayTs = todayStart.getTime();

  // Active robots = not idle
  const activeRobots = robots.filter(r => r.status !== 'idle').length;

  // Today's jobs
  const todayJobs = events.filter(e => e.timestamp >= todayTs && e.event === 'job_assigned').length;

  // Total MYZ earned (sum of all robots' totalEarned)
  const totalMyzEarned = robots.reduce((sum, r) => sum + (r.totalEarned || 0), 0);

  // Total fees from escrows
  const totalFees = escrows.reduce((sum, e) => sum + (e.fee || 0), 0);
  const totalFeesMyz = escrows.filter(e => e.currency === 'MYZ').reduce((sum, e) => sum + (e.fee || 0), 0);
  const totalFeesXmr = escrows.filter(e => e.currency === 'XMR').reduce((sum, e) => sum + (e.fee || 0), 0);

  // Jobs by status (from escrows)
  const jobsByStatus = {
    locked: escrows.filter(e => e.status === 'LOCKED').length,
    delivered: escrows.filter(e => e.status === 'DELIVERED').length,
    completed: escrows.filter(e => e.status === 'COMPLETED').length,
    contested: escrows.filter(e => e.status === 'CONTESTED').length
  };

  // Jobs over time (last 7 days)
  const jobsByDay = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - i * 86400000); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const count = events.filter(e =>
      e.timestamp >= dayStart.getTime() &&
      e.timestamp < dayEnd.getTime() &&
      e.event === 'job_assigned'
    ).length;
    jobsByDay.push({
      date: dayStart.toISOString().slice(0, 10),
      label: dayStart.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
      count
    });
  }

  // Earnings over time (last 7 days — from completed escrows)
  const earningsByDay = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - i * 86400000); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayEscrows = escrows.filter(e =>
      e.status === 'COMPLETED' &&
      e.createdAt >= dayStart.getTime() &&
      e.createdAt < dayEnd.getTime()
    );
    earningsByDay.push({
      date: dayStart.toISOString().slice(0, 10),
      label: dayStart.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' }),
      myz: dayEscrows.filter(e => e.currency === 'MYZ').reduce((s, e) => s + e.netAmount, 0),
      xmr: dayEscrows.filter(e => e.currency === 'XMR').reduce((s, e) => s + e.netAmount, 0),
      fees: dayEscrows.reduce((s, e) => s + e.fee, 0)
    });
  }

  // Robot status distribution
  const robotsByStatus = {
    idle: robots.filter(r => r.status === 'idle').length,
    working: robots.filter(r => r.status === 'working').length,
    delivering: robots.filter(r => r.status === 'delivering').length,
    dispute: robots.filter(r => r.status === 'dispute').length
  };

  res.json({
    success: true,
    data: {
      summary: {
        activeRobots,
        todayJobs,
        totalMyzEarned,
        totalFees,
        totalFeesMyz,
        totalFeesXmr,
        totalRobots: robots.length,
        totalEscrows: escrows.length
      },
      robotsByStatus,
      jobsByStatus,
      jobsByDay,
      earningsByDay,
      recentEvents: events.slice(0, 10),
      serverTime: new Date().toISOString()
    }
  });
});

// GET /api/status — Gateway status (for /status page)
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
