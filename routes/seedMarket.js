const express = require('express');
const router = express.Router();

// Mock database (In-memory)
let catalog = [];
let exchanges = [];
let chats = {};
let reviews = [];

// --- CATALOGO E RICERCA ---
// GET /api/seedMarket/catalog?type=semi&area=Roma
router.get('/catalog', (req, res) => {
    const { type, area } = req.query;
    let results = catalog;
    if (type) results = results.filter(item => item.type.toLowerCase() === type.toLowerCase());
    if (area) results = results.filter(item => item.area.toLowerCase() === area.toLowerCase());
    res.json(results);
});

// POST /api/seedMarket/offer
router.post('/offer', (req, res) => {
    const { userId, type, name, description, area } = req.body;
    if (!userId || !type || !name || !area) {
        return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }
    const newItem = { id: `item_${Date.now()}`, userId, type, name, description, area, status: 'available' };
    catalog.push(newItem);
    res.json({ message: 'Offerta creata con successo', item: newItem });
});


// --- SISTEMA DI SCAMBIO ---
// POST /api/seedMarket/exchange/propose
router.post('/exchange/propose', (req, res) => {
    const { itemId, requesterId, proposedItemId } = req.body;
    const item = catalog.find(i => i.id === itemId);
    if (!item) return res.status(404).json({ error: 'Articolo non trovato' });

    const exchange = {
        id: `exc_${Date.now()}`,
        itemId,
        ownerId: item.userId,
        requesterId,
        proposedItemId,
        status: 'pending'
    };
    exchanges.push(exchange);
    chats[exchange.id] = []; // Initialize chat for this exchange
    res.json({ message: 'Proposta inviata', exchange });
});

// POST /api/seedMarket/exchange/accept
router.post('/exchange/accept', (req, res) => {
    const { exchangeId, ownerId, accept } = req.body;
    const exchange = exchanges.find(e => e.id === exchangeId);
    if (!exchange) return res.status(404).json({ error: 'Scambio non trovato' });
    if (exchange.ownerId !== ownerId) return res.status(403).json({ error: 'Non autorizzato' });

    exchange.status = accept ? 'accepted' : 'rejected';
    
    if (accept) {
        // Mark items as unavailable
        const item1 = catalog.find(i => i.id === exchange.itemId);
        const item2 = catalog.find(i => i.id === exchange.proposedItemId);
        if (item1) item1.status = 'exchanged';
        if (item2) item2.status = 'exchanged';
    }

    res.json({ message: `Scambio ${exchange.status}`, exchange });
});


// --- CHAT TRA UTENTI ---
// POST /api/seedMarket/chat
router.post('/chat', (req, res) => {
    const { exchangeId, senderId, message } = req.body;
    if (!chats[exchangeId]) return res.status(404).json({ error: 'Chat non trovata per questo scambio' });

    const msg = { senderId, message, timestamp: new Date().toISOString() };
    chats[exchangeId].push(msg);
    res.json({ message: 'Messaggio inviato', msg });
});

// GET /api/seedMarket/chat/:exchangeId
router.get('/chat/:exchangeId', (req, res) => {
    const { exchangeId } = req.params;
    if (!chats[exchangeId]) return res.status(404).json({ error: 'Chat non trovata' });
    res.json(chats[exchangeId]);
});


// --- RECENSIONI ---
// POST /api/seedMarket/review
router.post('/review', (req, res) => {
    const { exchangeId, reviewerId, revieweeId, rating, comment } = req.body;
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating deve essere tra 1 e 5' });

    const review = { id: `rev_${Date.now()}`, exchangeId, reviewerId, revieweeId, rating, comment, timestamp: new Date().toISOString() };
    reviews.push(review);
    res.json({ message: 'Recensione salvata', review });
});

module.exports = router;
