// backend/routes/skills.js
const express = require('express');
const router = express.Router();

// ─── GET /api/skills ───
router.get('/', async (req, res) => {
    try {
        // TODO: Implementare recupero skills dal database
        res.json({
            success: true,
            data: [
                {
                    id: 'skill_1',
                    name: 'Idraulico',
                    category: 'Manutenzione',
                    description: 'Riparazioni idrauliche e installazioni',
                    professionalId: 'user_1',
                    price: 50,
                    rating: 4.5,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'skill_2',
                    name: 'Elettricista',
                    category: 'Manutenzione',
                    description: 'Impianti elettrici e riparazioni',
                    professionalId: 'user_1',
                    price: 60,
                    rating: 4.8,
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

// ─── POST /api/skills ───
router.post('/', async (req, res) => {
    try {
        const { name, category, description, price, professionalId } = req.body;
        
        // TODO: Implementare creazione skill
        const newSkill = {
            id: 'skill_' + Date.now(),
            name,
            category,
            description,
            price,
            professionalId,
            rating: 0,
            createdAt: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: newSkill
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── GET /api/skills/:id ───
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // TODO: Implementare recupero skill singola
        res.json({
            success: true,
            data: {
                id: id,
                name: 'Idraulico',
                category: 'Manutenzione',
                description: 'Riparazioni idrauliche e installazioni',
                professionalId: 'user_1',
                price: 50,
                rating: 4.5,
                reviews: [
                    { id: 'rev_1', rating: 5, comment: 'Ottimo lavoro!' },
                    { id: 'rev_2', rating: 4, comment: 'Buon servizio' }
                ],
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

// ─── PUT /api/skills/:id ───
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, description, price } = req.body;
        
        // TODO: Implementare aggiornamento skill
        res.json({
            success: true,
            message: 'Skill aggiornata',
            data: { id, name, category, description, price }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── DELETE /api/skills/:id ───
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // TODO: Implementare cancellazione skill
        res.json({
            success: true,
            message: 'Skill cancellata',
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