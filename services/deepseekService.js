const axios = require('axios');

const OLLAMA_URL = 'http://localhost:11434/api/chat';
const MODEL_NAME = 'deepseek-r1:1.5b'; // Cambia in 'llama3.2:1b' se vuoi più leggero

async function askDeepSeek(prompt, systemPrompt = 'Sei un assistente AI per la piattaforma MyZubster.', temperature = 0.7) {
    try {
        const response = await axios.post(OLLAMA_URL, {
            model: MODEL_NAME,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            stream: false,
            options: {
                temperature: temperature
            }
        });

        return response.data.message.content;
    } catch (error) {
        console.error('❌ Errore Ollama:', error.response?.data || error.message);
        throw new Error('Impossibile ottenere risposta dal modello AI locale.');
    }
}

module.exports = { askDeepSeek };
