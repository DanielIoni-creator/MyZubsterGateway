// routes/multisig.js
// Webhook + API routes for AI multisig third-signer agent (Issue #65)

const express = require('express');
const router = express.Router();
const { MultisigAgent } = require('../src/agents/multisig-agent');

let agentInstance = null;
function getAgent() {
  if (!agentInstance) agentInstance = new MultisigAgent({ name: 'MyZubster Multisig Agent' });
  return agentInstance;
}

// POST /api/multisig/webhook — receive order notifications, trigger AI decision
router.post('/webhook', async (req, res) => {
  try {
    const agent = getAgent();
    const { orderId, orderStatus, workEvidence, buyerAddress, sellerAddress, amount, externalOrderRef, expectedAmount } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });
    
    const signature = req.headers['x-webhook-signature'];
    const result = await agent.process(
      { orderId, orderStatus, workEvidence, buyerAddress, sellerAddress, amount, externalOrderRef, expectedAmount },
      { webhookSignature: signature, source: 'webhook' }
    );
    res.json(result);
  } catch (error) {
    console.error('[Multisig Webhook] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/multisig/decide — manual trigger for testing
router.post('/decide', async (req, res) => {
  try {
    const agent = getAgent();
    const { orderId, orderStatus, workEvidence, buyerAddress, sellerAddress, amount } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });
    const result = await agent.process({ orderId, orderStatus, workEvidence, buyerAddress, sellerAddress, amount }, { source: 'manual' });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/multisig/decisions — decision history
router.get('/decisions', (req, res) => {
  const agent = getAgent();
  const limit = parseInt(req.query.limit) || 50;
  res.json({ agent: agent.name, total: agent.decisions.length, decisions: agent.getDecisionHistory(limit) });
});

// GET /api/multisig/status — agent status
router.get('/status', (req, res) => {
  res.json(getAgent().getStatus());
});

// GET /api/multisig/health
router.get('/health', (req, res) => {
  res.json({ status: 'ok', agent: 'multisig-third-signer', timestamp: new Date().toISOString() });
});

module.exports = router;
module.exports.getAgent = getAgent;
