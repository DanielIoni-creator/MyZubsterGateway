// backend/routes/bookings.js
const express = require('express');
const router = express.Router();

// ─── GET /api/bookings ───
router.get('/', async (req, res) => {
    try {
        // TODO: Implementare recupero prenotazioni dal database
        res.json({
            success: true,
            data: [
                {
                    id: 'booking_1',
                    service: 'Idraulico',
                    professional: 'Mario Rossi',
                    date: '2026-07-10',
                    status: 'pending',
                    amount: 50
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

// ─── POST /api/bookings ───
router.post('/', async (req, res) => {
    try {
        const { serviceId, professionalId, date, timeSlot } = req.body;
        
        // TODO: Implementare creazione prenotazione
        const newBooking = {
            id: 'booking_' + Date.now(),
            serviceId,
            professionalId,
            date,
            timeSlot,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: newBooking
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── GET /api/bookings/:id ───
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // TODO: Implementare recupero prenotazione singola
        res.json({
            success: true,
            data: {
                id: id,
                service: 'Idraulico',
                professional: 'Mario Rossi',
                date: '2026-07-10',
                status: 'pending',
                amount: 50
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── PUT /api/bookings/:id ───
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // TODO: Implementare aggiornamento prenotazione
        res.json({
            success: true,
            message: 'Prenotazione aggiornata',
            data: { id, status }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── DELETE /api/bookings/:id ───
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // TODO: Implementare cancellazione prenotazione
        res.json({
            success: true,
            message: 'Prenotazione cancellata',
            data: { id }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;