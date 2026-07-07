// backend/routes/payments.js
const express = require('express');
const router = express.Router();

// ─── GET /api/payments ───
router.get('/', async (req, res) => {
    try {
        // TODO: Implementare recupero pagamenti dal database
        res.json({
            success: true,
            data: [
                {
                    id: 'pay_1',
                    bookingId: 'booking_1',
                    amount: 50,
                    fee: 1,
                    status: 'completed',
                    txHash: 'sim_tx_123',
                    createdAt: new Date().toISOString()
                }
            ]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── POST /api/payments ───
router.post('/', async (req, res) => {
    try {
        const { bookingId, amount, userAddress } = req.body;
        
        // TODO: Implementare creazione pagamento
        const newPayment = {
            id: 'pay_' + Date.now(),
            bookingId,
            amount,
            fee: amount * 0.02,
            status: 'pending',
            userAddress,
            txHash: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            createdAt: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: newPayment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── GET /api/payments/:id ───
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        res.json({
            success: true,
            data: {
                id: id,
                bookingId: 'booking_1',
                amount: 50,
                fee: 1,
                status: 'completed',
                txHash: 'sim_tx_123',
                createdAt: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── PUT /api/payments/:id ───
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        res.json({
            success: true,
            message: 'Pagamento aggiornato',
            data: { id, status }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;