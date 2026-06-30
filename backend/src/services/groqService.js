const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

async function generateServiceDescription(title, category) {
    try {
        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: 'system',
                    content: 'Sei un assistente che aiuta a descrivere servizi di vicinato in modo chiaro e accattivante.'
                },
                {
                    role: 'user',
                    content: `Genera una breve descrizione per un servizio di "${category}" chiamato "${title}". Usa un tono professionale ma amichevole.`
                }
            ],
            model: 'mixtral-8x7b-32768',
            temperature: 0.7,
            max_tokens: 150,
        });

        return response.choices[0]?.message?.content || '';
    } catch (error) {
        console.error('Errore chiamata Groq:', error);
        throw error;
    }
}

module.exports = { generateServiceDescription };