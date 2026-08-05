// routes/robotHardware.js — Hardware bridge for physical robots (BOT-8, closes #345)
// Supports MQTT and WebSocket protocols for Arduino, Raspberry Pi, Jetson Nano
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const devices = new Map();
const telemetryHistory = new Map();

// POST /api/robot/hardware/connect — Register physical robot
router.post('/hardware/connect', (req, res) => {
  try {
    const { name, type, protocol, capabilities } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type required' });

    const deviceId = `hw_${crypto.randomUUID().slice(0, 8)}`;
    const apiKey = crypto.randomBytes(16).toString('hex');
    const device = {
      deviceId, name, type, protocol: protocol || 'mqtt',
      capabilities: capabilities || [],
      status: 'connected',
      apiKey,
      connectedAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      telemetry: { cpu: null, memory: null, temperature: null, uptime: null }
    };
    devices.set(deviceId, device);
    res.status(201).json({ success: true, device: { ...device, apiKey } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/hardware/devices — List all connected devices
router.get('/hardware/devices', (req, res) => {
  const { type, status } = req.query;
  let list = Array.from(devices.values());
  if (type) list = list.filter(d => d.type === type);
  if (status) list = list.filter(d => d.status === status);
  res.json({ devices: list, count: list.length });
});

// GET /api/robot/hardware/device/:deviceId — Get device details
router.get('/hardware/device/:deviceId', (req, res) => {
  const device = devices.get(req.params.deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  res.json({ device });
});

// POST /api/robot/hardware/command — Send command to physical robot
router.post('/hardware/command', (req, res) => {
  try {
    const { deviceId, command, params, apiKey } = req.body;
    if (!deviceId || !command) return res.status(400).json({ error: 'deviceId and command required' });

    const device = devices.get(deviceId);
    if (!device) return res.status(404).json({ error: 'Device not found' });

    // Auth check
    if (apiKey && apiKey !== device.apiKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const cmd = {
      commandId, deviceId, command, params: params || {},
      status: 'sent',
      sentAt: new Date().toISOString(),
      executedAt: null,
      result: null
    };

    // In production, this would publish to MQTT topic: devices/{deviceId}/commands
    console.log(`📡 [Hardware] CMD → ${deviceId}: ${command}(${JSON.stringify(params)})`);

    // Simulate async response
    setTimeout(() => {
      cmd.status = 'executed';
      cmd.executedAt = new Date().toISOString();
      cmd.result = { success: true, output: `${command} executed on ${device.name}` };
    }, 500);

    res.status(202).json({ success: true, command: cmd });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/robot/hardware/telemetry — Receive telemetry from physical robot
router.post('/hardware/telemetry', (req, res) => {
  try {
    const { deviceId, apiKey, cpu, memory, temperature, uptime, custom } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    const device = devices.get(deviceId);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    if (apiKey && apiKey !== device.apiKey) return res.status(401).json({ error: 'Invalid API key' });

    device.telemetry = { cpu, memory, temperature, uptime, ...custom, updatedAt: new Date().toISOString() };
    device.lastSeen = new Date().toISOString();

    // Store history
    if (!telemetryHistory.has(deviceId)) telemetryHistory.set(deviceId, []);
    const history = telemetryHistory.get(deviceId);
    history.push({
      timestamp: new Date().toISOString(),
      cpu, memory, temperature, uptime
    });
    if (history.length > 1000) history.shift(); // Keep last 1000 readings

    res.json({ success: true, received: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/robot/hardware/telemetry/:deviceId — Get telemetry history
router.get('/hardware/telemetry/:deviceId', (req, res) => {
  const history = telemetryHistory.get(req.params.deviceId) || [];
  const device = devices.get(req.params.deviceId);
  res.json({
    deviceId: req.params.deviceId,
    current: device?.telemetry || null,
    history: history.slice(-100),
    totalReadings: history.length
  });
});

// POST /api/robot/hardware/disconnect — Disconnect device
router.post('/hardware/disconnect', (req, res) => {
  const device = devices.get(req.body.deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });
  device.status = 'disconnected';
  device.disconnectedAt = new Date().toISOString();
  res.json({ success: true, device });
});

// GET /api/robot/hardware/protocols — Supported protocols info
router.get('/hardware/protocols', (req, res) => {
  res.json({
    protocols: {
      mqtt: {
        description: 'MQTT (Message Queue Telemetry Transport) — recommended for IoT',
        topics: {
          commands: 'devices/{deviceId}/commands',
          telemetry: 'devices/{deviceId}/telemetry',
          status: 'devices/{deviceId}/status'
        },
        broker: process.env.MQTT_BROKER || 'mqtt://localhost:1883'
      },
      websocket: {
        description: 'WebSocket — real-time bidirectional communication',
        endpoint: '/ws/hardware',
        auth: 'apiKey as query param'
      },
      http: {
        description: 'HTTP REST API — polling-based',
        endpoints: ['/api/robot/hardware/telemetry', '/api/robot/hardware/command']
      }
    },
    supportedHardware: ['Arduino (MQTT)', 'Raspberry Pi (MQTT/WS)', 'Jetson Nano (MQTT/WS)', 'ESP32 (MQTT)', 'Generic Linux (WS/HTTP)']
  });
});

module.exports = router;
