const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tariService = require('../services/tariService');

// GET /api/tari/balance
router.get('/balance', auth, async (req, res) => {
  try {
    const balance = await tariService.getBalance();
    res.json({ success: true, balance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tari/nft/mint
router.post('/nft/mint', auth, async (req, res) => {
  try {
    const { name, description, metadata } = req.body;
    const nft = await tariService.mintNFT(name, description, req.user._id.toString(), metadata || {});
    res.status(201).json({ success: true, nft });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tari/escrow
router.post('/escrow', auth, async (req, res) => {
  try {
    const { amount, buyer, seller, arbiter } = req.body;
    const escrow = await tariService.createEscrow(amount, buyer, seller, arbiter);
    res.status(201).json({ success: true, escrow });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
