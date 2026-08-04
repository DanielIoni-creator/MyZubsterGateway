// middleware/auth.js - JWT Authentication middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here_change_me';

/**
 * Middleware per verificare il token JWT
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Accesso negato',
      message: 'Token JWT mancante. Fornisci un token valido nell\'header Authorization: Bearer <token>'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token scaduto',
        message: 'Il token JWT è scaduto. Effettua nuovamente il login.'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        error: 'Token non valido',
        message: 'Il token JWT fornito non è valido.'
      });
    }
    return res.status(403).json({
      error: 'Errore autenticazione',
      message: error.message
    });
  }
}

/**
 * Genera un token JWT per un utente
 */
function generateToken(userId, email) {
  return jwt.sign(
    { id: userId, email },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = {
  authenticateToken,
  generateToken,
  JWT_SECRET
};