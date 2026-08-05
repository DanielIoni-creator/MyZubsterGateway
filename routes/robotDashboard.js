// routes/robotDashboard.js — Real-time robot dashboard with WebSocket (BOT-1, closes #338)
const express = require('express');
const router = express.Router();
const WebSocket = require('ws');

// WebSocket server reference (set by main server)
let wss = null;
const clients = new Map();

function setWSServer(server) {
  wss = new WebSocket.Server({ server, path: '/ws/dashboard' });
  wss.on('connection', (ws, req) => {
    const clientId = `ws_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    clients.set(clientId, { ws, connectedAt: new Date().toISOString(), filters: {} });
    
    ws.send(JSON.stringify({ type: 'connected', clientId, message: 'Connected to robot dashboard' }));
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'subscribe' && msg.channels) {
          const client = clients.get(clientId);
          if (client) client.filters = { channels: msg.channels };
        }
      } catch(e) {}
    });

    ws.on('close', () => clients.delete(clientId));
  });
  return wss;
}

// Broadcast event to all connected clients
function broadcast(event, data, channel = 'all') {
  if (!wss) return;
  const payload = JSON.stringify({ type: 'event', event, data, channel, timestamp: new Date().toISOString() });
  clients.forEach((client, id) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      const filters = client.filters.channels;
      if (!filters || filters.includes(channel) || filters.includes('all') || channel === 'all') {
        client.ws.send(payload);
      }
    }
  });
}

// REST endpoint to trigger events (for integration with robot system)
router.post('/dashboard/event', (req, res) => {
  try {
    const { event, data, channel } = req.body;
    if (!event) return res.status(400).json({ error: 'event required' });
    broadcast(event, data, channel || 'all');
    res.json({ success: true, clients: clients.size });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/dashboard/stats — Current dashboard stats
router.get('/dashboard/stats', (req, res) => {
  res.json({
    connectedClients: clients.size,
    channels: {
      'robot:status': [...clients.values()].filter(c => !c.filters.channels || c.filters.channels.includes('robot:status')).length,
      'job:progress': [...clients.values()].filter(c => !c.filters.channels || c.filters.channels.includes('job:progress')).length,
      'escrow:update': [...clients.values()].filter(c => !c.filters.channels || c.filters.channels.includes('escrow:update')).length,
    },
    uptime: process.uptime()
  });
});

// GET /api/robot/dashboard — Dashboard HTML page
router.get('/dashboard', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MyZubster — Robot Dashboard</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh}
    .header{background:#1e293b;padding:1rem 2rem;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #334155}
    .header h1{font-size:1.25rem;color:#38bdf8}
    .status-dot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:6px}
    .status-dot.connected{background:#22c55e;box-shadow:0 0 6px #22c55e}
    .status-dot.disconnected{background:#ef4444}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;padding:1.5rem}
    .card{background:#1e293b;border-radius:8px;padding:1.25rem;border:1px solid #334155}
    .card h3{color:#94a3b8;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.5rem}
    .card .value{font-size:2rem;font-weight:700;color:#f8fafc}
    .card .sub{font-size:0.8rem;color:#64748b;margin-top:0.25rem}
    .events{grid-column:1/-1;max-height:400px;overflow-y:auto}
    .event-row{padding:0.5rem 0;border-bottom:1px solid #1e293b;font-size:0.85rem;display:flex;gap:0.5rem}
    .event-row .time{color:#64748b;min-width:80px}
    .event-row .type{color:#38bdf8;min-width:120px}
    .event-row .data{color:#94a3b8;word-break:break-all}
    .channel-tabs{display:flex;gap:0.5rem;margin-bottom:1rem}
    .channel-tab{padding:0.35rem 1rem;border-radius:20px;font-size:0.8rem;cursor:pointer;background:#334155;border:1px solid #475569;color:#94a3b8}
    .channel-tab.active{background:#1d4ed8;border-color:#3b82f6;color:#fff}
  </style>
</head>
<body>
<div class="header">
  <h1>🤖 MyZubster Robot Dashboard</h1>
  <div><span class="status-dot" id="wsStatus"></span><span id="wsLabel">Connecting...</span></div>
</div>

<div class="grid">
  <div class="card"><h3>🤖 Active Robots</h3><div class="value" id="activeRobots">0</div><div class="sub">Real-time status</div></div>
  <div class="card"><h3>📋 Jobs Today</h3><div class="value" id="jobsToday">0</div><div class="sub">Completed / Total</div></div>
  <div class="card"><h3>💰 MYZ Earned</h3><div class="value" id="totalEarned">0</div><div class="sub">Total earnings</div></div>
  <div class="card"><h3>🔒 Escrow Active</h3><div class="value" id="escrowActive">0</div><div class="sub">Locked funds</div></div>
</div>

<div class="card events">
  <h3 style="margin-bottom:0.5rem">📡 Live Events</h3>
  <div class="channel-tabs">
    <span class="channel-tab active" onclick="filterChannel('all')">All</span>
    <span class="channel-tab" onclick="filterChannel('robot:status')">Robots</span>
    <span class="channel-tab" onclick="filterChannel('job:progress')">Jobs</span>
    <span class="channel-tab" onclick="filterChannel('escrow:update')">Escrow</span>
  </div>
  <div id="events"></div>
</div>

<script>
const wsUrl = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws/dashboard';
let ws, activeChannel = 'all';
const eventsEl = document.getElementById('events');
const maxEvents = 100;

function connect() {
  ws = new WebSocket(wsUrl);
  ws.onopen = () => {
    document.getElementById('wsStatus').className = 'status-dot connected';
    document.getElementById('wsLabel').textContent = 'Connected';
    ws.send(JSON.stringify({type:'subscribe',channels:['all']}));
  };
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.type === 'connected') return;
    if (data.type === 'event') handleEvent(data);
  };
  ws.onclose = () => {
    document.getElementById('wsStatus').className = 'status-dot disconnected';
    document.getElementById('wsLabel').textContent = 'Reconnecting...';
    setTimeout(connect, 3000);
  };
}

function handleEvent(msg) {
  if (msg.channel === 'robot:status' && msg.event === 'update') {
    document.getElementById('activeRobots').textContent = msg.data?.active || 0;
  }
  if (msg.channel === 'job:progress') {
    document.getElementById('jobsToday').textContent = msg.data?.completed || 0;
  }
  if (msg.channel === 'escrow:update') {
    document.getElementById('escrowActive').textContent = msg.data?.active || 0;
  }
  document.getElementById('totalEarned').textContent = (msg.data?.totalEarned || 0).toFixed(0);

  if (activeChannel === 'all' || activeChannel === msg.channel) {
    const row = document.createElement('div');
    row.className = 'event-row';
    row.innerHTML = '<span class="time">' + new Date(msg.timestamp).toLocaleTimeString() + '</span>' +
      '<span class="type">' + msg.event + '</span>' +
      '<span class="data">' + JSON.stringify(msg.data).slice(0,100) + '</span>';
    eventsEl.insertBefore(row, eventsEl.firstChild);
    while (eventsEl.children.length > maxEvents) eventsEl.lastChild.remove();
  }
}

function filterChannel(ch) {
  activeChannel = ch;
  document.querySelectorAll('.channel-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  eventsEl.innerHTML = '';
}

connect();
</script>
</body>
</html>`);
});

module.exports = { router, setWSServer, broadcast };
