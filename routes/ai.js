const express = require('express');
const router = express.Router();
const aiMultisigAgent = require('../services/aiMultisigAgent');

router.get('/status', async (req, res) => {
  try {
    const status = await aiMultisigAgent.getAgentStatus();
    res.json({ ok: true, data: status });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

router.post('/escrow/:escrowId/evaluate', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const result = await aiMultisigAgent.evaluateEscrow(escrowId);
    res.json({ ok: true, data: result });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ ok: false, error: error.message });
  }
});

module.exports = router;
