const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const OrderBook = require('../models/OrderBook');
const TokenHolding = require('../models/TokenHolding');

// GET /api/marketplace/orders/:tokenId - Lista ordini aperti
router.get('/orders/:tokenId', async (req, res) => {
  try {
    const orders = await OrderBook.find({
      token: req.params.tokenId,
      status: 'open'
    }).populate('seller', 'username email');
    res.json(orders);
  } catch (error) {
    console.error('Errore recupero ordini:', error);
    res.status(500).json({ error: 'Errore nel recupero degli ordini' });
  }
});

// POST /api/marketplace/sell - Crea ordine di vendita
router.post('/sell', auth, async (req, res) => {
  try {
    const { tokenId, amount, price } = req.body;

    // Verifica che il venditore abbia abbastanza token
    const holding = await TokenHolding.findOne({ user: req.user._id, token: tokenId });
    if (!holding || holding.amount < amount) {
      return res.status(400).json({ error: 'Token insufficienti' });
    }

    const totalPrice = amount * price;
    const order = new OrderBook({
      token: tokenId,
      seller: req.user._id,
      amount,
      price,
      totalPrice,
      status: 'open',
    });
    await order.save();

    // Blocca i token
    holding.lockedAmount = (holding.lockedAmount || 0) + amount;
    await holding.save();

    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('Errore creazione ordine:', error);
    res.status(500).json({ error: error.message || 'Errore nella creazione dell\'ordine' });
  }
});

// POST /api/marketplace/buy/:orderId - Acquista da un ordine
router.post('/buy/:orderId', auth, async (req, res) => {
  try {
    const order = await OrderBook.findById(req.params.orderId);
    if (!order) return res.status(404).json({ error: 'Ordine non trovato' });
    if (order.status !== 'open') return res.status(400).json({ error: 'Ordine non più disponibile' });

    const amount = req.body.amount || 1;
    if (amount > order.amount) return res.status(400).json({ error: 'Quantità richiesta supera quella disponibile' });

    // Aggiorna l'ordine
    order.amount -= amount;
    if (order.amount === 0) {
      order.status = 'filled';
    }
    await order.save();

    // Trasferisci token dal venditore all'acquirente
    const sellerHolding = await TokenHolding.findOne({ user: order.seller, token: order.token });
    if (sellerHolding) {
      sellerHolding.lockedAmount = Math.max(0, sellerHolding.lockedAmount - amount);
      sellerHolding.amount -= amount;
      await sellerHolding.save();
    }

    let buyerHolding = await TokenHolding.findOne({ user: req.user._id, token: order.token });
    if (!buyerHolding) {
      buyerHolding = new TokenHolding({
        user: req.user._id,
        token: order.token,
        amount: 0,
        lockedAmount: 0
      });
    }
    buyerHolding.amount += amount;
    await buyerHolding.save();

    res.json({ success: true, order, amount });
  } catch (error) {
    console.error('Errore acquisto:', error);
    res.status(500).json({ error: error.message || 'Errore nell\'acquisto' });
  }
});

module.exports = router;
