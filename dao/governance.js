const express = require('express');
const router = express.Router();

// Proposte di governance (in memoria)
const proposals = [];
let nextId = 1;

// Creare una proposta
router.post('/proposals', (req, res) => {
    const { title, description, proposer } = req.body;
    if (!title || !description || !proposer) {
        return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }
    
    const proposal = {
        id: nextId++,
        title,
        description,
        proposer,
        votes: { for: 0, against: 0, abstain: 0 },
        status: 'pending',
        createdAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    proposals.push(proposal);
    res.json({ success: true, proposal });
});

// Votare una proposta
router.post('/proposals/:id/vote', (req, res) => {
    const { id } = req.params;
    const { vote, voter } = req.body;
    const proposal = proposals.find(p => p.id === parseInt(id));
    if (!proposal) {
        return res.status(404).json({ error: 'Proposta non trovata' });
    }
    if (proposal.status !== 'pending') {
        return res.status(400).json({ error: 'Proposta già chiusa' });
    }
    
    if (!['for', 'against', 'abstain'].includes(vote)) {
        return res.status(400).json({ error: 'Voto non valido' });
    }
    
    proposal.votes[vote] = (proposal.votes[vote] || 0) + 1;
    res.json({ success: true, proposal });
});

// Ottenere tutte le proposte
router.get('/proposals', (req, res) => {
    res.json({ success: true, proposals });
});

// Ottenere una proposta specifica
router.get('/proposals/:id', (req, res) => {
    const proposal = proposals.find(p => p.id === parseInt(req.params.id));
    if (!proposal) {
        return res.status(404).json({ error: 'Proposta non trovata' });
    }
    res.json({ success: true, proposal });
});

module.exports = router;
