const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead,
  deleteMessage
} = require('../controllers/messageController');

// POST /api/messages - Invia un messaggio
router.post('/', sendMessage);

// GET /api/messages/:userId1/:userId2 - Ottieni messaggi tra due utenti
router.get('/:userId1/:userId2', getMessages);

// GET /api/messages/conversations/:userId - Ottieni conversazioni di un utente
router.get('/conversations/:userId', getConversations);

// PUT /api/messages/read - Segna messaggi come letti
router.put('/read', markAsRead);

// DELETE /api/messages/:messageId - Elimina un messaggio
router.delete('/:messageId', deleteMessage);

module.exports = router;
