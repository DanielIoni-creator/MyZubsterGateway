const express = require('express');
const { exec } = require('child_process');
const app = express();
const PORT = 5000;
const SECRET = 'myzubster_control_2026';

app.use(express.json());

const auth = (req, res, next) => {
  const token = req.headers['x-api-key'] || req.query.token;
  if (token !== SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/api/status', auth, (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/services', auth, async (req, res) => {
  const services = [
    { name: 'Marketplace', port: 4000, url: 'http://localhost:4000/api/health' },
    { name: 'Gateway', port: 3000, url: 'http://localhost:3000/api/health' },
    { name: 'MongoDB', port: 27017, url: 'http://localhost:27017' }
  ];

  const results = [];
  for (const svc of services) {
    try {
      const response = await fetch(svc.url, { signal: AbortSignal.timeout(3000) });
      results.push({
        ...svc,
        status: response.ok ? 'online' : 'error',
        code: response.status
      });
    } catch (e) {
      results.push({
        ...svc,
        status: 'offline',
        error: e.message
      });
    }
  }
  res.json(results);
});

app.post('/api/restart/:service', auth, (req, res) => {
  const { service } = req.params;
  const commands = {
    marketplace: 'cd ~/MyZubster-Marketplace && pkill -f nodemon && npx nodemon server.js &',
    gateway: 'cd ~/MyZubsterGateway && pkill -f "node.*gateway" && npm run start &',
    all: 'pkill -f nodemon && pkill -f "node.*gateway" && cd ~/MyZubster-Marketplace && npx nodemon server.js & && cd ~/MyZubsterGateway && npm run start &'
  };

  const cmd = commands[service];
  if (!cmd) {
    return res.status(400).json({ error: 'Servizio non valido. Usa: marketplace, gateway, all' });
  }

  exec(cmd, (error, stdout, stderr) => {
    res.json({
      service,
      command: cmd,
      stdout,
      stderr,
      error: error ? error.message : null
    });
  });
});

app.get('/api/logs/:service', auth, (req, res) => {
  const { service } = req.params;
  const logFiles = {
    marketplace: '~/MyZubster-Marketplace/nohup.out',
    gateway: '~/MyZubsterGateway/gateway.log'
  };

  const file = logFiles[service];
  if (!file) {
    return res.status(400).json({ error: 'Servizio non valido' });
  }

  const tail = req.query.tail || 50;
  exec(`tail -n ${tail} ${file}`, (error, stdout, stderr) => {
    res.json({
      service,
      logs: stdout,
      error: stderr || null
    });
  });
});

app.post('/api/update', auth, (req, res) => {
  const { repo } = req.body;
  const commands = {
    marketplace: 'cd ~/MyZubster-Marketplace && git pull && npm install',
    gateway: 'cd ~/MyZubsterGateway && git pull && npm install',
    all: 'cd ~/MyZubster-Marketplace && git pull && npm install && cd ~/MyZubsterGateway && git pull && npm install'
  };

  const cmd = commands[repo || 'all'];
  if (!cmd) {
    return res.status(400).json({ error: 'Repo non valido. Usa: marketplace, gateway, all' });
  }

  exec(cmd, (error, stdout, stderr) => {
    res.json({
      command: cmd,
      stdout,
      stderr,
      error: error ? error.message : null
    });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🛠️ Control API avviata su http://0.0.0.0:${PORT}`);
  console.log(`🔑 API Key: ${SECRET}`);
});
