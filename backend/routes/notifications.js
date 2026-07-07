// backend/routes/notifications.js
const express = require('express');
const router = express.Router();

// ─── GET /api/notifications ───
router.get('/', async (req, res) => {
    try {
        // TODO: Implementare recupero notifiche dal database
        res.json({
            success: true,
            data: [
                {
                    id: 'notif_1',
                    userId: 'user_1',
                    title: 'Nuova prenotazione',
                    message: 'Hai ricevuto una nuova prenotazione da Mario Rossi',
                    type: 'booking',
                    read: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'notif_2',
                    userId: 'user_1',
                    title: 'Recensione ricevuta',
                    message: 'Hai ricevuto una nuova recensione (5 stelle)',
                    type: 'review',
                    read: false,
                    createdAt: new Date(Date.now() - 3600000).toISOString()
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

// ─── POST /api/notifications ───
router.post('/', async (req, res) => {
    try {
        const { userId, title, message, type } = req.body;
        
        if (!userId || !title || !message) {
            return res.status(400).json({
                success: false,
                error: 'Campi obbligatori: userId, title, message'
            });
        }
        
        // TODO: Implementare creazione notifica nel database
        const newNotification = {
            id: 'notif_' + Date.now(),
            userId,
            title,
            message,
            type: type || 'general',
            read: false,
            createdAt: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: newNotification
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── GET /api/notifications/user/:userId ───
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // TODO: Implementare recupero notifiche per utente
        res.json({
            success: true,
            data: [
                {
                    id: 'notif_1',
                    userId: userId,
                    title: 'Nuova prenotazione',
                    message: 'Hai ricevuto una nuova prenotazione',
                    type: 'booking',
                    read: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'notif_2',
                    userId: userId,
                    title: 'Recensione ricevuta',
                    message: 'Hai ricevuto una nuova recensione',
                    type: 'review',
                    read: true,
                    createdAt: new Date(Date.now() - 3600000).toISOString()
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

// ─── PUT /api/notifications/:id/read ───
router.put('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        
        // TODO: Implementare segna come letta
        res.json({
            success: true,
            message: 'Notifica segnata come letta',
            data: { id, read: true }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── DELETE /api/notifications/:id ───
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // TODO: Implementare cancellazione notifica
        res.json({
            success: true,
            message: 'Notifica cancellata',
            data: { id }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── PUT /api/notifications/read-all ───
router.put('/read-all', async (req, res) => {
    try {
        const { userId } = req.body;
        
        // TODO: Implementare segna tutte come lette
        res.json({
            success: true,
            message: 'Tutte le notifiche segnate come lette',
            data: { userId }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;