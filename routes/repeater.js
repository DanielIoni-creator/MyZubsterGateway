// routes/repeater.js - Repeater Logic API - Bounty #788
const express = require('express');
const router = express.Router();
const repeaterService = require('../services/repeaterService');

router.post('/node/register', (req, res) => {
  try {
    const { nodeId, position, neighbors, bandwidth } = req.body;
    if (!nodeId || !position) return res.status(400).json({ error: 'Missing nodeId or position' });
    const node = repeaterService.registerNode({ nodeId, position, neighbors: neighbors || [], bandwidth });
    res.json({ success: true, data: node });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/route', async (req, res) => {
  try {
    const { fromNodeId, toNodeId, payload } = req.body;
    if (!fromNodeId || !toNodeId) return res.status(400).json({ error: 'Missing fromNodeId or toNodeId' });
    const result = await repeaterService.routeMessage(fromNodeId, toNodeId, payload || {});
    res.json({ success: true, data: result });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/cache', (req, res) => {
  try {
    const { key, data, ttlMs } = req.body;
    if (!key || data === undefined) return res.status(400).json({ error: 'Missing key or data' });
    const entry = repeaterService.cacheData(key, data, ttlMs);
    res.json({ success: true, data: entry });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/cache/:key', (req, res) => {
  try {
    const data = repeaterService.getCachedData(req.params.key);
    if (data === null) return res.status(404).json({ error: 'Cache miss or expired' });
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/node/failure', (req, res) => {
  try {
    const { nodeId } = req.body;
    if (!nodeId) return res.status(400).json({ error: 'Missing nodeId' });
    repeaterService.handleNodeFailure(nodeId);
    res.json({ success: true, message: 'Node failure handled' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/mesh/status', (req, res) => {
  try {
    const status = repeaterService.getMeshStatus();
    res.json({ success: true, data: status });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/logs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = repeaterService.getLogs(limit);
    res.json({ success: true, data: logs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
