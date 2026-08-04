const express = require('express');
const router = express.Router();
const FeeService = require('../services/FeeService');

// Ottieni configurazione fee corrente
router.get('/config', async (req, res) => {
    try {
        const config = await FeeService.getCurrentFeeConfig();
        res.json({ success: true, data: config });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Calcola fee per una transazione
router.post('/calculate', async (req, res) => {
    try {
        const { amount, volume } = req.body;
        const feeInfo = await FeeService.calculateAffineFee(amount, volume || 0);
        res.json({ success: true, data: feeInfo });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Calcola distribuzione fee
router.post('/distribution', async (req, res) => {
    try {
        const { totalFee } = req.body;
        const distribution = await FeeService.calculateDistribution(totalFee);
        res.json({ success: true, data: distribution });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crea proposta per modificare fee
router.post('/propose', async (req, res) => {
    try {
        const { proposerAddress, description, newBaseFee, newVariableRate } = req.body;
        const result = await FeeService.createProposal(
            proposerAddress,
            description,
            parseInt(newBaseFee),
            parseInt(newVariableRate)
        );
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Vota una proposta
router.post('/vote/:proposalId', async (req, res) => {
    try {
        const { proposalId } = req.params;
        const { voterAddress, support } = req.body;
        const result = await FeeService.voteOnProposal(
            parseInt(proposalId),
            voterAddress,
            support
        );
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Ottieni dettagli di una proposta
router.get('/proposal/:id', async (req, res) => {
    try {
        const proposal = await FeeService.getProposalDetails(parseInt(req.params.id));
        res.json({ success: true, data: proposal });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Ottieni balance staked di un wallet
router.get('/staked/:address', async (req, res) => {
    try {
        const balance = await FeeService.getStakedBalance(req.params.address);
        res.json({ success: true, data: { address: req.params.address, stakedBalance: balance } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;