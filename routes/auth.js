const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Limite stretto su auth per prevenire brute-force (bounty #39)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 20, // max 20 tentativi per IP per finestra
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi di login/registrazione, riprova piu tardi.' },
});

// REGISTRAZIONE
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email, password });
    await user.save();
    res.status(201).json({ success: true, message: 'Utente registrato con successo' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// LOGIN
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, error: 'Credenziali non valide' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Credenziali non valide' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;