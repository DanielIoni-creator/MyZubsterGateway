// backend/routes/feeRoutes.js
const express = require('express');
const router = express.Router();
const BlockchainService = require('../services/BlockchainService');

// ─── GET /api/fee/config ───
router.get('/config', async (req, res) => {
    try {
        const config = await BlockchainService.getCurrentFee();
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── POST /api/fee/calculate ───
router.post('/calculate', async (req, res) => {
    try {
        const { amount, volume = 0 } = req.body;
        
        if (!amount) {
            return res.status(400).json({
                success: false,
                error: 'Campo "amount" obbligatorio'
            });
        }
        
        const result = await BlockchainService.getCompleteFeeInfo(amount, volume);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── POST /api/fee/distribution ───
router.post('/distribution', async (req, res) => {
    try {
        const { totalFee } = req.body;
        
        if (!totalFee) {
            return res.status(400).json({
                success: false,
                error: 'Campo "totalFee" obbligatorio'
            });
        }
        
        const distribution = await BlockchainService.calculateDistribution(totalFee);
        res.json({
            success: true,
            data: distribution
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── POST /api/fee/proposal ───
router.post('/proposal', async (req, res) => {
    try {
        const { fromAddress, description, newBaseFee, newVariableRate } = req.body;
        
        if (!fromAddress || !description || !newBaseFee || !newVariableRate) {
            return res.status(400).json({
                success: false,
                error: 'Campi obbligatori: fromAddress, description, newBaseFee, newVariableRate'
            });
        }
        
        const result = await BlockchainService.createProposal(
            fromAddress,
            description,
            parseInt(newBaseFee),
            parseInt(newVariableRate)
        );
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── POST /api/fee/distribute ───
router.post('/distribute', async (req, res) => {
    try {
        const { fromAddress, totalFee } = req.body;
        
        if (!fromAddress || !totalFee) {
            return res.status(400).json({
                success: false,
                error: 'Campi obbligatori: fromAddress, totalFee'
            });
        }
        
        const result = await BlockchainService.distributeFees(fromAddress, parseInt(totalFee));
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;