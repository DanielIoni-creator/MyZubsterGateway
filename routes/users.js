const express = require('express');
const router = express.Router();

// GET /api/users - Lista utenti (protetta)
router.get('/', (req, res) => {
  res.json({ users: [] });
});

// POST /api/users - Crea un nuovo utente
router.post('/', (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) {
    return res.status(400).json({ error: 'Username e email sono obbligatori' });
  }
  res.status(201).json({ id: Date.now(), username, email });
});

module.exports = router;
