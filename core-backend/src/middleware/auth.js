const jwt = require('jsonwebtoken');
const User = require('../models/User');

// SECURITY FIX (Issue #889): Removed hardcoded JWT secret fallback.
// JWT_SECRET environment variable is now REQUIRED.
// Fail closed: if missing, all token verification fails.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[SECURITY] JWT_SECRET environment variable is not set. Authentication is disabled.');
}

const auth = {
  verifyToken: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
      }

      if (!JWT_SECRET) {
        return res.status(500).json({ success: false, error: 'Server configuration error' });
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user) {
        return res.status(401).json({ success: false, error: 'User not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  },

  isAdmin: async (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
  },

  isProfessional: async (req, res, next) => {
    if (req.user.role !== 'professional' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Professional access required' });
    }
    next();
  }
};

module.exports = auth;
