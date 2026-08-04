const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = {
  verifyToken: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
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