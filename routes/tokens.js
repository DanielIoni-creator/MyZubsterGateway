const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Token = require('../models/Token');
const TokenHolding = require('../models/TokenHolding');

// GET /api/tokens - Lista token attivi
router.get('/', async (req, res) => {
  try {
    const tokens = await Token.find({ status: 'active' });
    res.json(tokens);
  } catch (error) {
    console.error('Errore recupero token:', error);
    res.status(500).json({ error: 'Errore nel recupero dei token' });
  }
});

// GET /api/tokens/holdings - Holding utente
router.get('/holdings', auth, async (req, res) => {
  try {
    const holdings = await TokenHolding.find({ user: req.user._id })
      .populate('token', 'name symbol tokenPrice assetType');
    res.json(holdings);
  } catch (error) {
    console.error('Errore recupero holding:', error);
    res.status(500).json({ error: 'Errore nel recupero delle holding' });
  }
});

// GET /api/tokens/:id - Dettaglio token
router.get('/:id', async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) return res.status(404).json({ error: 'Token non trovato' });
    res.json(token);
  } catch (error) {
    console.error('Errore recupero token:', error);
    res.status(500).json({ error: 'Errore nel recupero del token' });
  }
});

// POST /api/tokens - Crea token
router.post('/', auth, async (req, res) => {
  try {
    const { name, symbol, totalSupply, assetValue, tokenPrice, assetType, assetDescription, assetLocation } = req.body;
    
    const token = new Token({
      name,
      symbol,
      totalSupply,
      assetValue,
      tokenPrice,
      assetType,
      assetDescription,
      assetLocation: assetLocation || '',
      issuer: req.user._id,
      status: 'active'
    });
    await token.save();

    // Crea holding per l'issuer
    const holding = new TokenHolding({
      user: req.user._id,
      token: token._id,
      amount: totalSupply,
      lockedAmount: 0
    });
    await holding.save();

    res.status(201).json({ success: true, token });
  } catch (error) {
    console.error('Errore creazione token:', error);
    res.status(500).json({ error: error.message || 'Errore nella creazione del token' });
  }
});

module.exports = router;
