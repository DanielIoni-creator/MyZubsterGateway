// backend/routes/auth.js
const express = require('express');
const router = express.Router();

// ─── REGISTRAZIONE ───
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // TODO: Implementare registrazione reale
        res.json({
            success: true,
            message: 'Registrazione simulata',
            user: { id: 'user_123', name, email }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── LOGIN ───
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // TODO: Implementare login reale
        res.json({
            success: true,
            token: 'sim_token_' + Date.now(),
            user: { id: 'user_123', name: 'Test User', email }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ─── GET /me ───
router.get('/me', async (req, res) => {
    try {
        // TODO: Implementare get user reale
        res.json({
            success: true,
            user: { id: 'user_123', name: 'Test User', email: 'test@example.com' }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;