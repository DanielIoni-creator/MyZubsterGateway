// routes/auth.js - Rotte di autenticazione
const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticateToken, generateToken } = require('../middleware/auth'); // 👈 IMPORTANTE!

const router = express.Router();

// UTENTI IN MEMORIA (sostituisci con database)
const users = [];

// Inizializza un utente admin di default
(async () => {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  users.push({
    id: 1,
    email: 'admin@myzubster.com',
    password: hashedPassword,
    role: 'admin',
    createdAt: new Date()
  });
  console.log('👤 Utente admin creato: admin@myzubster.com / admin123');
})();

/**
 * POST /api/auth/login
 * Autentica un utente e restituisce un token JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Campi mancanti',
        message: 'Email e password sono obbligatori'
      });
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({
        error: 'Credenziali non valide',
        message: 'Email o password errati'
      });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({
        error: 'Credenziali non valide',
        message: 'Email o password errati'
      });
    }

    const token = generateToken(user.id, user.email);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  } catch (error) {
    console.error('❌ Errore login:', error);
    res.status(500).json({
      error: 'Errore interno del server',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/auth/me
 * Restituisce i dati dell'utente autenticato
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: req.user
  });
});

module.exports = router;