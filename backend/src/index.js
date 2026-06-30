require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { generateServiceDescription } = require('./services/groqService');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ROTTA DI TEST PER GROQ
app.post('/api/test/groq', async (req, res) => {
    try {
        const { title, category } = req.body;
        if (!title || !category) {
            return res.status(400).json({ error: 'Titolo e categoria sono obbligatori' });
        }

        const description = await generateServiceDescription(title, category);
        res.json({ success: true, description });
    } catch (error) {
        console.error('Errore Groq:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'myzubster-backend' });
});

app.listen(port, () => {
    console.log(`✅ Server avviato sulla porta ${port}`);
    console.log(`🌐 http://localhost:${port}/health`);
});