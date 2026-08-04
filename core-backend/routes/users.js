// backend/routes/users.js
const express = require('express');
const router = express.Router();

// ─── GET /api/users ───
router.get('/', async (req, res) => {
    try {
        // TODO: Implementare recupero utenti dal database
        res.json({
            success: true,
            data: [
                {
                    id: 'user_1',
                    name: 'Mario Rossi',
                    email: 'mario@example.com',
                    role: 'professional',
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'user_2',
                    name: 'Laura Bianchi',
                    email: 'laura@example.com',
                    role: 'client',
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

// ─── GET /api/users/:id ───
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // TODO: Implementare recupero utente singolo
        res.json({
            success: true,
            data: {
                id: id,
                name: 'Utente ' + id,
                email: 'utente@example.com',
                role: 'professional',
                skills: ['Idraulico', 'Elettricista'],
                rating: 4.5,
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

// ─── PUT /api/users/:id ───
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role } = req.body;
        
        // TODO: Implementare aggiornamento utente
        res.json({
            success: true,
            message: 'Utente aggiornato',
            data: { id, name, email, role }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── DELETE /api/users/:id ───
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // TODO: Implementare cancellazione utente
        res.json({
            success: true,
            message: 'Utente cancellato',
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