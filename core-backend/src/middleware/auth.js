const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

const auth = {
  /**
   * verifyToken — Estrae e verifica il JWT, carica l'utente e popola il ruolo RBAC.
   * Deve essere chiamato PRIMA di qualsiasi middleware RBAC.
   */
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

      // Popola il ruolo RBAC se l'utente ha un ObjectId come role
      if (user.role && typeof user.role !== 'string' && !(user.role instanceof String)) {
        // È un ObjectId — cerca il Role e popola i permessi
        try {
          const roleDoc = await Role.findById(user.role).populate('permissions');
          if (roleDoc) {
            user._roleDoc = roleDoc;
            // Mantieni compatibilità con codice legacy che usa user.role come stringa
            // esponendo user.role temporaneamente come stringa per isAdmin() etc.
          }
        } catch (err) {
          // Se il caricamento RBAC fallisce, procedi comunque (fallback)
          console.warn('RBAC role lookup failed for user:', user._id, err.message);
        }
      } else if (typeof user.role === 'string' || user.role instanceof String) {
        // Ruolo stringa legacy — cerca nel DB RBAC
        try {
          const roleDoc = await Role.findOne({ name: user.role.toLowerCase() }).populate('permissions');
          if (roleDoc) {
            user._roleDoc = roleDoc;
          }
        } catch (err) {
          console.warn('RBAC role lookup failed for user:', user._id, err.message);
        }
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  },

  /**
   * isAdmin — Verifica che l'utente abbia ruolo admin.
   * Integrato con RBAC: controlla req.user._roleDoc se disponibile,
   * altrimenti fallback su user.role === 'admin' (compatibilità legacy).
   */
  isAdmin: async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Controllo RBAC prioritario
      if (req.user._roleDoc) {
        if (req.user._roleDoc.name === 'admin') {
          return next();
        }
      }

      // Fallback legacy: ruolo stringa
      const roleStr = typeof req.user.role === 'object'
        ? (req.user.role.name || '')
        : String(req.user.role || '');

      if (roleStr.toLowerCase() === 'admin') {
        return next();
      }

      return res.status(403).json({ success: false, error: 'Admin access required' });
    } catch (error) {
      console.error('isAdmin middleware error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  /**
   * isModerator — Verifica che l'utente sia almeno moderator.
   */
  isModerator: async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      if (req.user._roleDoc) {
        if (['admin', 'moderator'].includes(req.user._roleDoc.name)) {
          return next();
        }
      }

      const roleStr = typeof req.user.role === 'object'
        ? (req.user.role.name || '')
        : String(req.user.role || '');

      if (['admin', 'moderator'].includes(roleStr.toLowerCase())) {
        return next();
      }

      return res.status(403).json({ success: false, error: 'Moderator access required' });
    } catch (error) {
      console.error('isModerator middleware error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  /**
   * isProfessional — Verifica che l'utente sia professional o admin.
   */
  isProfessional: async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const roleStr = typeof req.user.role === 'object'
        ? (req.user.role.name || '')
        : String(req.user.role || '');

      if (roleStr === 'professional' || roleStr === 'admin') {
        return next();
      }

      return res.status(403).json({ success: false, error: 'Professional access required' });
    } catch (error) {
      console.error('isProfessional middleware error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
};

module.exports = auth;
