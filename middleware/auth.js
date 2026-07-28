// middleware/auth.js
const jwtService = require('../services/jwtService');

// Middleware per verificare il token JWT
const authenticate = async (req, res, next) => {
  try {
    // Prendi il token dall'header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: req.t('auth.tokenMissing')
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwtService.verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: req.t('auth.tokenInvalid') });
    }

    // Aggiungi i dati dell'utente alla request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('Errore autenticazione:', error);
    return res.status(500).json({ error: req.t('error.internal') });
  }
};

// Middleware per verificare che l'utente sia admin
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: req.t('auth.adminRequired') });
  }
};

module.exports = {
  authenticate,
  authorizeAdmin
};
