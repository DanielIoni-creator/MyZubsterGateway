// routes/antenna.js — Antenna Protocol API — Bounty #787
const express = require('express');
const router = express.Router();
const antennaService = require('../services/antennaService');

// POST /api/antenna/register — Registra nuovo nodo antenna
router.post('/register', (req, res) => {
  try {
    const { nodeId, type, location, capabilities } = req.body;
    if (!nodeId || !type) return res.status(400).json({ error: 'Missing nodeId or type' });
    const node = antennaService.registerNode({ nodeId, type, location, capabilities });
    res.json({ success: true, data: node });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/antenna/status — Stato di tutti i nodi
router.get('/status', (req, res) => {
  try {
    const nodes = antennaService.getAllNodes();
    res.json({ success: true, data: nodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/antenna/status/:nodeId — Stato di un nodo specifico
router.get('/status/:nodeId', (req, res) => {
  try {
    const status = antennaService.getNodeStatus(req.params.nodeId);
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/antenna/command — Invia comando a un nodo
router.post('/command', async (req, res) => {
  try {
    const { nodeId, command, params } = req.body;
    if (!nodeId || !command) return res.status(400).json({ error: 'Missing nodeId or command' });
    const cmd = await antennaService.sendCommand(nodeId, command, params || {});
    res.json({ success: true, data: cmd });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/antenna/ping — Heartbeat nodo
router.post('/ping', (req, res) => {
  try {
    const { nodeId } = req.body;
    if (!nodeId) return res.status(400).json({ error: 'Missing nodeId' });
    const result = antennaService.pingNode(nodeId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// GET /api/antenna/dashboard — Dashboard riepilogativa
router.get('/dashboard', (req, res) => {
  try {
    const dashboard = antennaService.getDashboard();
    res.json({ success: true, data: dashboard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
