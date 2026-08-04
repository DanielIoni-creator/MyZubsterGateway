const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ============================================
// REGISTRAZIONE
// ============================================
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, name } = req.body;

        // Verifica campi obbligatori
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username, email e password sono obbligatori' 
            });
        }

        // Verifica se l'utente esiste già
        const existingUser = await User.findOne({ 
            $or: [{ email }, { username }] 
        });
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                error: 'Username o email già in uso' 
            });
        }

        // Hash della password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crea nuovo utente
        const user = new User({
            username,
            email,
            password: hashedPassword,
            name: name || username,
            role: 'user',
            isActive: true,
            createdAt: new Date()
        });

        await user.save();

        // Genera token JWT
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Registrazione completata',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Errore registrazione:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Errore durante la registrazione' 
        });
    }
});

// ============================================
// LOGIN
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Verifica campi obbligatori
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email e password sono obbligatori' 
            });
        }

        // Trova l'utente per email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Credenziali non valide' 
            });
        }

        // Verifica password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                error: 'Credenziali non valide' 
            });
        }

        // Verifica se l'utente è attivo
        if (!user.isActive) {
            return res.status(403).json({ 
                success: false, 
                error: 'Account disattivato' 
            });
        }

        // Genera token JWT
        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Aggiorna ultimo accesso
        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            message: 'Login effettuato',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Errore login:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Errore durante il login' 
        });
    }
});

// ============================================
// VERIFICA TOKEN
// ============================================
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'Token richiesto' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'Utente non trovato' 
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(401).json({ 
            success: false, 
            error: 'Token non valido o scaduto' 
        });
    }
});

module.exports = router;
