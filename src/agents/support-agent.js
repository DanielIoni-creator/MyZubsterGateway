// src/agents/support-agent.js
// Chatbot IA per supporto utenti e sviluppatori
// Bounty #734 - 800 MYZ

const { BaseAgent } = require('./base-agent');
const crypto = require('crypto');

class SupportAgent extends BaseAgent {
  constructor(config = {}) {
    super({
      name: 'support-agent',
      role: 'customer-support',
      memory: config.memory || null
    });
    
    this.knowledgeBase = new Map();
    this.tickets = new Map();
    this.faqCache = new Map();
    this.responseTemplates = new Map();
    this.analytics = {
      totalQueries: 0,
      resolvedTickets: 0,
      avgResponseTime: 0,
      topCategories: new Map()
    };
    this.sessionContexts = new Map();
    
    // Initialize knowledge base
    this._initKnowledgeBase();
    this._initResponseTemplates();
  }

  _initKnowledgeBase() {
    const kb = [
      { q: ['wallet', 'creare', 'portafoglio'], 
        a: 'Per creare un wallet MyZubster, visita https://myzubster.com/wallet e segui la procedura guidata. Ti servirà salvare la seed phrase in un luogo sicuro.' },
      { q: ['transazione', 'inviare', 'MYZ'], 
        a: 'Per inviare MYZ: vai su Wallet > Invia, inserisci l\'indirizzo Tari del destinatario e l\'importo. Controlla sempre due volte l\'indirizzo.' },
      { q: ['escrow', 'deposito', 'fiduciario'], 
        a: 'L\'escrow MyZubster protegge acquirente e venditore. I fondi sono bloccati fino al completamento delle milestone concordate.' },
      { q: ['bounty', 'guadagnare', 'task'], 
        a: 'Le bounty sono disponibili su GitHub: github.com/MyZubster-Ecosystem/MyZubsterGateway/issues. Cerca label "bounty" e "good-first-issue".' },
      { q: ['robot', 'automazione', 'agente'], 
        a: 'I robot MyZubster automatizzano pagamenti e task. Puoi crearne uno dalla dashboard Robot > Crea Nuovo Robot.' },
      { q: ['XMR', 'monero', 'privacy'], 
        a: 'Monero (XMR) è la criptovaluta privacy usata come base. MyZubster aggiunge il layer applicativo per pagamenti e contratti.' },
      { q: ['gas', 'commissioni', 'fee'], 
        a: 'Le commissioni di rete Monero sono molto basse (frazioni di centesimo). MyZubster non applica commissioni aggiuntive sulle transazioni base.' },
      { q: ['sicurezza', 'seed', 'password'], 
        a: 'Non condividere MAI la tua seed phrase o chiave privata. MyZubster non te le chiederà mai. Usa password complesse e 2FA quando disponibile.' }
    ];
    
    kb.forEach(entry => {
      entry.q.forEach(keyword => {
        if (!this.knowledgeBase.has(keyword)) {
          this.knowledgeBase.set(keyword, []);
        }
        this.knowledgeBase.get(keyword).push(entry.a);
      });
    });
  }

  _initResponseTemplates() {
    this.responseTemplates.set('greeting', 
      'Ciao! Sono l\'assistente virtuale MyZubster. Come posso aiutarti oggi?\n\n' +
      'Puoi chiedermi informazioni su:\n' +
      '- Wallet e transazioni\n- Bounty e guadagni\n- Robot e automazione\n- Sicurezza e privacy');
    
    this.responseTemplates.set('ticket_created', 
      'Ticket creato con successo! Il tuo numero di riferimento è #{id}. ' +
      'Un membro del team ti risponderà entro 24 ore.');
    
    this.responseTemplates.set('not_found', 
      'Mi dispiace, non ho trovato una risposta specifica per la tua domanda. ' +
      'Ho creato un ticket di supporto (#{id}) - il team ti contatterà a breve.');
  }

  /**
   * Main execution method - processes user queries
   */
  async execute(data, context = {}) {
    const { query, userId, language = 'it' } = data;
    
    this.analytics.totalQueries++;
    const startTime = Date.now();
    
    // Maintain session context
    if (userId) {
      if (!this.sessionContexts.has(userId)) {
        this.sessionContexts.set(userId, { history: [], preferences: {} });
      }
      this.sessionContexts.get(userId).history.push({ query, timestamp: new Date() });
    }
    
    // Check for ticket commands
    if (query.toLowerCase().includes('ticket') || query.toLowerCase().includes('supporto')) {
      return this._handleTicketRequest(data, context);
    }
    
    // Search knowledge base
    const answer = this._searchKnowledgeBase(query);
    
    const responseTime = Date.now() - startTime;
    this._updateResponseTime(responseTime);
    
    if (answer) {
      return {
        type: 'kb_answer',
        answer,
        confidence: answer.confidence || 0.75,
        responseTime
      };
    }
    
    // Auto-create ticket for unanswered queries
    const ticket = this._createTicket(data, context);
    this.analytics.resolvedTickets++;
    
    const template = this.responseTemplates.get('not_found');
    return {
      type: 'ticket_created',
      answer: template.replace('{id}', ticket.id),
      ticket,
      responseTime
    };
  }

  _searchKnowledgeBase(query) {
    const words = query.toLowerCase().split(/\s+/);
    const matches = new Map();
    
    words.forEach(word => {
      if (this.knowledgeBase.has(word)) {
        const answers = this.knowledgeBase.get(word);
        answers.forEach(a => {
          matches.set(a, (matches.get(a) || 0) + 1);
        });
      }
    });
    
    if (matches.size === 0) return null;
    
    // Return best match
    const sorted = [...matches.entries()].sort((a, b) => b[1] - a[1]);
    return { answer: sorted[0][0], confidence: sorted[0][1] / words.length };
  }

  _createTicket(data, context) {
    const id = crypto.randomBytes(4).toString('hex');
    const ticket = {
      id,
      userId: data.userId || 'anonymous',
      query: data.query,
      status: 'open',
      priority: this._calculatePriority(data),
      category: this._categorizeQuery(data.query),
      createdAt: new Date().toISOString(),
      context
    };
    
    this.tickets.set(id, ticket);
    this._updateCategoryStats(ticket.category);
    
    return ticket;
  }

  _handleTicketRequest(data, context) {
    const existingTickets = [...this.tickets.values()]
      .filter(t => t.userId === data.userId && t.status === 'open');
    
    if (existingTickets.length > 0) {
      return {
        type: 'ticket_list',
        tickets: existingTickets.map(t => ({
          id: t.id, status: t.status, query: t.query.substring(0, 100),
          createdAt: t.createdAt
        }))
      };
    }
    
    const ticket = this._createTicket(data, context);
    const template = this.responseTemplates.get('ticket_created');
    return {
      type: 'ticket_created',
      answer: template.replace('{id}', ticket.id),
      ticket
    };
  }

  _calculatePriority(data) {
    const urgentKeywords = ['urgente', 'bloccato', 'perso', 'furto', 'hack'];
    const highKeywords = ['errore', 'problema', 'non funziona'];
    
    const query = (data.query || '').toLowerCase();
    if (urgentKeywords.some(k => query.includes(k))) return 'critical';
    if (highKeywords.some(k => query.includes(k))) return 'high';
    return 'normal';
  }

  _categorizeQuery(query) {
    const categories = {
      wallet: ['wallet', 'portafoglio', 'saldo', 'indirizzo'],
      transactions: ['transazione', 'inviare', 'ricevere', 'pagamento'],
      escrow: ['escrow', 'deposito', 'contratto', 'garanzia'],
      bounty: ['bounty', 'task', 'guadagno', 'ricompensa'],
      security: ['sicurezza', 'seed', 'password', 'hack'],
      robot: ['robot', 'agente', 'automazione']
    };
    
    const q = query.toLowerCase();
    for (const [cat, keywords] of Object.entries(categories)) {
      if (keywords.some(k => q.includes(k))) return cat;
    }
    return 'general';
  }

  _updateResponseTime(time) {
    const prev = this.analytics.avgResponseTime;
    const n = this.analytics.totalQueries;
    this.analytics.avgResponseTime = prev > 0 ? (prev * (n - 1) + time) / n : time;
  }

  _updateCategoryStats(category) {
    const count = this.analytics.topCategories.get(category) || 0;
    this.analytics.topCategories.set(category, count + 1);
  }

  /**
   * Get agent statistics
   */
  getAnalytics() {
    return {
      ...this.analytics,
      topCategories: Object.fromEntries(this.analytics.topCategories),
      knowledgeBaseSize: this.knowledgeBase.size,
      openTickets: [...this.tickets.values()].filter(t => t.status === 'open').length,
      activeSessions: this.sessionContexts.size
    };
  }

  /**
   * Resolve a ticket
   */
  resolveTicket(ticketId, resolution) {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) return { success: false, error: 'Ticket not found' };
    
    ticket.status = 'resolved';
    ticket.resolution = resolution;
    ticket.resolvedAt = new Date().toISOString();
    this.tickets.set(ticketId, ticket);
    
    return { success: true, ticket };
  }

  /**
   * Add custom knowledge base entry
   */
  addKnowledge(keywords, answer) {
    keywords.forEach(k => {
      if (!this.knowledgeBase.has(k)) {
        this.knowledgeBase.set(k, []);
      }
      this.knowledgeBase.get(k).push(answer);
    });
    return { success: true, kbSize: this.knowledgeBase.size };
  }
}

module.exports = { SupportAgent };
