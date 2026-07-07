const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote');
const Booking = require('../models/Booking');
// const { authenticate } = require('../middleware/auth'); // COMMENTATO PER TEST

// POST /api/quotes - Crea preventivo (TEST - senza auth)
router.post('/', async (req, res) => {
    try {
        const { bookingId, amount, description } = req.body;

        if (!bookingId || !amount) {
            return res.status(400).json({
                success: false,
                error: 'bookingId e amount sono obbligatori'
            });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Prenotazione non trovata'
            });
        }

        const quote = new Quote({
            bookingId,
            amount,
            description,
            status: 'pending'
        });

        await quote.save();

        booking.quoteStatus = 'pending';
        booking.quoteAmount = amount;
        await booking.save();

        res.status(201).json({
            success: true,
            data: quote,
            message: 'Preventivo creato con successo'
        });

    } catch (error) {
        console.error('Errore creazione preventivo:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// GET /api/quotes/booking/:bookingId - Recupera preventivo
router.get('/booking/:bookingId', async (req, res) => {
    try {
        const { bookingId } = req.params;

        const quote = await Quote.findOne({ bookingId })
            .populate('bookingId', 'date timeSlot status');

        if (!quote) {
            return res.status(404).json({
                success: false,
                error: 'Preventivo non trovato'
            });
        }

        res.json({
            success: true,
            data: quote
        });

    } catch (error) {
        console.error('Errore recupero preventivo:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

// PUT /api/quotes/:id/status - Aggiorna stato (TEST - senza auth)
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Stato non valido'
            });
        }

        const quote = await Quote.findById(id);
        if (!quote) {
            return res.status(404).json({
                success: false,
                error: 'Preventivo non trovato'
            });
        }

        const booking = await Booking.findById(quote.bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                error: 'Prenotazione non trovata'
            });
        }

        quote.status = status;
        quote.updatedAt = new Date();
        await quote.save();

        booking.quoteStatus = status;
        if (status === 'accepted') {
            booking.status = 'confirmed';
        } else if (status === 'rejected') {
            booking.status = 'cancelled';
        }
        await booking.save();

        res.json({
            success: true,
            data: quote,
            message: `Preventivo ${status === 'accepted' ? 'accettato' : 'rifiutato'}`
        });

    } catch (error) {
        console.error('Errore aggiornamento preventivo:', error);
        res.status(500).json({
            success: false,
            error: 'Errore interno del server'
        });
    }
});

module.exports = router;