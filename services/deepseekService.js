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

        const message = response.data && response.data.message;
        if (!message || message.content === undefined || message.content === null) {
            if (message && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
                throw new Error('Model returned tool_calls without content; content extraction not supported here.');
            }
            throw new Error('Model response missing content field.');
        }
        return message.content;
    } catch (error) {
        if (error.message && (
            error.message.includes('missing content') ||
            error.message.includes('tool_calls')
        )) {
            throw error;
        }
        console.error('❌ Errore Ollama:', error.response?.data || error.message);
        throw new Error('Impossibile ottenere risposta dal modello AI locale.');
    }
}

module.exports = { askDeepSeek };
