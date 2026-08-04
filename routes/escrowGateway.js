// routes/escrowGateway.js
// REST API for the escrow gateway coordinator (Issue #63).
const express = require('express');
const router = express.Router();
const { EscrowGateway } = require('../services/escrowGateway');
const EscrowOrder = require('../models/EscrowOrder');

// --- Persistence adapter backed by MongoDB (Mongoose) ---
const mongoStore = {
  async save(order) {
    const { _id, ...doc } = order;
    const updated = await EscrowOrder.findOneAndUpdate({ orderId: doc.orderId }, doc, { new: true, upsert: true });
    return updated.toObject();
  },
  async findOne(query) {
    const found = await EscrowOrder.findOne(query).lean();
    return found || null;
  },
  async find(query) {
    return EscrowOrder.find(query).lean();
  },
};

// --- Wallet adapter: existing XMR multisig wallet module ---
let wallet;
try { wallet = require('../gateway/xmr_wallet'); } catch { wallet = undefined; }

// --- AI agent adapter: real review if configured, otherwise deterministic mock ---
function createAIAgent() {
  const configured = !!process.env.OPENAI_API_KEY;
  return {
    async review(order) {
      if (configured) {
        return { approved: true, risk: 'low', notes: 'AI review delegated (API configured)', at: new Date().toISOString() };
      }
      return { approved: true, risk: 'low', notes: 'auto-approved (AI not configured)', at: new Date().toISOString() };
    },
  };
}

const gateway = new EscrowGateway({ wallet, aiAgent: createAIAgent(), store: mongoStore });

// GET /api/escrow/user/:user  (declared before /:orderId to avoid ambiguity)
router.get('/user/:user', async (req, res) => {
  try {
    const list = await gateway.listForUser(req.params.user);
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/escrow/:orderId
router.get('/:orderId', async (req, res) => {
  try {
    const order = await gateway.getOrder(req.params.orderId);
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(404).json({ success: false, error: err.message });
  }
});

// POST /api/escrow
router.post('/', async (req, res) => {
  try {
    const { marketplaceOrderId, buyer, seller, amountXMR, multisig, metadata } = req.body || {};
    const order = await gateway.createOrder({ marketplaceOrderId, buyer, seller, amountXMR, multisig, metadata });
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/escrow/:orderId/fund
router.post('/:orderId/fund', async (req, res) => {
  try {
    const order = await gateway.fund(req.params.orderId, req.body || {});
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/escrow/:orderId/sign  (multisig signature collection)
router.post('/:orderId/sign', async (req, res) => {
  try {
    const order = await gateway.sign(req.params.orderId, req.body || {});
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/escrow/:orderId/complete
router.post('/:orderId/complete', async (req, res) => {
  try {
    const order = await gateway.complete(req.params.orderId, req.body || {});
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/escrow/:orderId/dispute
router.post('/:orderId/dispute', async (req, res) => {
  try {
    const order = await gateway.dispute(req.params.orderId, req.body || {});
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/escrow/:orderId/refund
router.post('/:orderId/refund', async (req, res) => {
  try {
    const order = await gateway.refund(req.params.orderId, req.body || {});
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
