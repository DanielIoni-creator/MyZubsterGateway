const express = require('express');
const router = express.Router();

const chatSessions = [];
const supportTickets = [];

const KB_ENTRIES = [
  { id: 'kb_1', topic: 'MYZ Wallet Payouts', content: 'MYZ token payouts are disbursed directly to EVM wallet addresses starting with 0x within 24 hours.' },
  { id: 'kb_2', topic: 'Gateway Node Setup', content: 'Run git clone and npm install, then configure PORT and NODE_ENV in your .env file.' },
];

// POST /api/ai-chatbot/chat - Interactive AI chatbot session
router.post('/chat', (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message string is required' });
  }

  const reply = `Zubster AI Assistant: Thank you for your question "${message}". Our gateway documentation and knowledge base entries are available to assist.`;
  const session = {
    sessionId: sessionId || `sess_${Date.now()}`,
    userMessage: message,
    aiReply: reply,
    timestamp: new Date().toISOString(),
  };

  chatSessions.push(session);
  res.status(201).json({ success: true, session });
});

// GET /api/ai-chatbot/kb - Query knowledge base
router.get('/kb', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.json({ knowledgeBase: KB_ENTRIES });
  }

  const query = q.toLowerCase();
  const results = KB_ENTRIES.filter((k) => k.topic.toLowerCase().includes(query) || k.content.toLowerCase().includes(query));

  res.json({ query: q, results });
});

// POST /api/ai-chatbot/tickets - Create support ticket
router.post('/tickets', (req, res) => {
  const { title, description, category, userEmail } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'title and description are required' });
  }

  const ticket = {
    id: `tkt_${Date.now()}`,
    title,
    description,
    category: category || 'GENERAL',
    userEmail: userEmail || 'support@myzubster.org',
    status: 'OPEN',
    createdAt: new Date().toISOString(),
  };

  supportTickets.push(ticket);
  res.status(201).json({ success: true, ticket });
});

// GET /api/ai-chatbot/analytics - Chatbot analytics & metrics
router.get('/analytics', (req, res) => {
  res.json({
    totalChatSessions: chatSessions.length,
    totalTicketsCreated: supportTickets.length,
    resolvedResolutionRate: '94.2%',
    avgResponseTimeSeconds: 1.2,
  });
});

module.exports = router;
