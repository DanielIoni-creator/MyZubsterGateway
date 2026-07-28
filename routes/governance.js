const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const governanceService = require('../services/governanceService');
const Proposal = require('../models/Proposal');

// GET /api/governance/proposals - Lista proposte attive
router.get('/proposals', async (req, res) => {
  try {
    const proposals = await governanceService.getActiveProposals();
    res.json(proposals);
  } catch (error) {
    console.error('Errore recupero proposte:', error);
    res.status(500).json({ error: 'Errore nel recupero delle proposte' });
  }
});

// GET /api/governance/history - Storico proposte
router.get('/history', async (req, res) => {
  try {
    const history = await governanceService.getProposalHistory();
    res.json(history);
  } catch (error) {
    console.error('Errore recupero storico:', error);
    res.status(500).json({ error: 'Errore nel recupero dello storico' });
  }
});

// GET /api/governance/proposals/:id - Dettaglio proposta
router.get('/proposals/:id', async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate('proposer', 'username email');
    if (!proposal) {
      return res.status(404).json({ error: 'Proposta non trovata' });
    }
    res.json(proposal);
  } catch (error) {
    console.error('Errore recupero proposta:', error);
    res.status(500).json({ error: 'Errore nel recupero della proposta' });
  }
});

// POST /api/governance/proposals - Crea proposta
router.post('/proposals', auth, async (req, res) => {
  try {
    const { title, description, category, votingDays } = req.body;
    const proposal = await governanceService.createProposal(
      req.user._id,
      title,
      description,
      category,
      votingDays
    );
    res.status(201).json({ success: true, proposal });
  } catch (error) {
    console.error('Errore creazione proposta:', error);
    res.status(500).json({ error: error.message || 'Errore nella creazione della proposta' });
  }
});

// POST /api/governance/proposals/:id/vote - Vota una proposta
router.post('/proposals/:id/vote', auth, async (req, res) => {
  try {
    const { vote } = req.body;
    if (!['for', 'against', 'abstain'].includes(vote)) {
      return res.status(400).json({ error: 'Voto non valido' });
    }
    const result = await governanceService.voteOnProposal(req.params.id, req.user._id, vote);
    res.json({ success: true, vote: result });
  } catch (error) {
    console.error('Errore voto:', error);
    res.status(500).json({ error: error.message || 'Errore durante il voto' });
  }
});

// POST /api/governance/proposals/:id/execute - Esegue proposta passata
router.post('/proposals/:id/execute', auth, async (req, res) => {
  try {
    const proposal = await governanceService.executeProposal(req.params.id);
    res.json({ success: true, proposal });
  } catch (error) {
    console.error('Errore esecuzione proposta:', error);
    res.status(500).json({ error: error.message || 'Errore durante l\'esecuzione' });
  }
});

// GET /api/governance/proposals/:id/vote/status - Stato voto utente
router.get('/proposals/:id/vote/status', auth, async (req, res) => {
  try {
    const vote = await governanceService.getUserVote(req.params.id, req.user._id);
    res.json({ hasVoted: !!vote, vote });
  } catch (error) {
    console.error('Errore recupero voto:', error);
    res.status(500).json({ error: 'Errore nel recupero del voto' });
  }
});

module.exports = router;
