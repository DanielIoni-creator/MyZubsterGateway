// Servizio Groq - versione mock (senza API key)
// Rimpiazza con la vera implementazione quando avrai una chiave valida

async function generateServiceDescription(title, category) {
    // Simula una risposta di Groq
    const descriptions = {
        'idraulico': 'Offro servizi di idraulica professionale: riparazione tubature, installazione impianti, manutenzione caldaie. Intervento rapido e prezzi trasparenti.',
        'elettricista': 'Elettricista qualificato per riparazioni, installazioni e manutenzione impianti elettrici. Certificazioni e garanzia sul lavoro.',
        'parrucchiere': 'Servizio di parrucchieria a domicilio: taglio, colore, piega e trattamenti. Prodotti professionali e massima igiene.',
        'tutor': 'Lezioni private di matematica, fisica e informatica per studenti di ogni livello. Metodo personalizzato e flessibilità oraria.',
        'giardiniere': 'Manutenzione giardini: taglio erba, potatura, cura delle piante e progettazione verde. Servizio affidabile e puntuale.'
    };

    // Cerca una descrizione per la categoria, altrimenti usa una generica
    const key = category?.toLowerCase() || '';
    const description = descriptions[key] || 
        `Servizio professionale di "${title}" (categoria: ${category}). Qualità e affidabilità garantite. Contattami per un preventivo gratuito.`;

    return description;
}

module.exports = { generateServiceDescription };