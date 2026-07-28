const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// REGISTRAZIONE
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email, password });
    await user.save();
    res.status(201).json({ success: true, message: req.t('auth.registered') });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, error: req.t('auth.invalidCredentials') });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, error: req.t('auth.invalidCredentials') });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
