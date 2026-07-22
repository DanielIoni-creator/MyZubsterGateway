const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const deepseekService = require('../services/deepseekService');

router.post('/ask', auth, async (req, res) => {
    try {
        const { prompt, systemPrompt, temperature } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Il campo "prompt" è obbligatorio' });
        }
        const response = await deepseekService.askDeepSeek(prompt, systemPrompt, temperature);
        res.json({ success: true, response });
    } catch (error) {
        console.error('Errore in /api/ai/ask:', error);
        res.status(500).json({ error: error.message || 'Errore interno del server' });
    }
});

module.exports = router;
