const express = require('express');
const router = express.Router();
const Skill = require('../models/Skill');

// ============================================
// GET /api/skills/nearby - Competenze vicine (mock)
// ============================================
router.get('/nearby', (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    console.log(`📍 Ricerca competenze vicine a lat: ${lat}, lng: ${lng}`);

    const mockSkills = [
        {
            id: "1",
            title: "Riparazione lavatrice",
            description: "Riparo lavatrici a domicilio",
            category: "Elettrodomestici",
            price: 50,
            distanceKm: 2.3,
            location: { coordinates: [12.5, 44.1] },
            userId: "user1",
            userName: "Mario Rossi"
        },
        {
            id: "2",
            title: "Taglio capelli a domicilio",
            description: "Parrucchiere professionista",
            category: "Estetica",
            price: 25,
            distanceKm: 3.7,
            location: { coordinates: [12.6, 44.0] },
            userId: "user2",
            userName: "Lucia Bianchi"
        }
    ];

    res.json({
        success: true,
        data: mockSkills,
        count: mockSkills.length
    });
});

// ============================================
// POST /api/skills - Crea una skill (solo per test)
// ============================================
router.post('/', async (req, res) => {
    try {
        const { title, description, category, userId, price } = req.body;

        if (!title || !category) {
            return res.status(400).json({
                success: false,
                error: 'Titolo e categoria sono obbligatori'
            });
        }

        const skill = new Skill({
            title,
            description,
            category,
            userId: userId || 'test-user-123',
            price: price || 0,
            status: 'approved'
        });

        await skill.save();

        res.status(201).json({
            success: true,
            data: skill,
            message: 'Skill creata con successo'
        });

    } catch (error) {
        console.error('Errore creazione skill:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;