const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

exports.register = async (req, res) => {
  try {
    const { username, email, password, moneroWallet } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Username, email e password sono obbligatori' });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username o email già in uso' });
    }
    const user = new User({ username, email, password, moneroWallet });
    await user.save();
    const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ success: true, message: 'Utente registrato con successo', data: { user, token } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Errore durante la registrazione', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email e password sono obbligatori' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenziali non valide' });
    }
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Credenziali non valide' });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, message: 'Login effettuato con successo', data: { user, token } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Errore durante il login', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Utente non trovato' });
    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Errore durante il recupero del profilo', error: error.message });
  }
};
