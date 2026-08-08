const User = require('../models/User');
const Role = require('../models/Role');

/**
 * Middleware RBAC — verifica che l'utente autenticato abbia un permesso specifico.
 *
 * Utilizzo:
 *   router.get('/admin/users', auth.verifyToken, rbac.hasPermission('users', 'read'), handler);
 *
 * La verifica:
 *   1. Controlla che req.user esista (deve essere chiamato DOPO verifyToken).
 *   2. Popola req.user.role con i permessi associati.
 *   3. Verifica che il ruolo dell'utente abbia il permesso (resource, action).
 *   4. Se il ruolo è 'admin' e non ha ancora permissions popolate, concede accesso
 *      come fallback retrocompatibile.
 */

const hasPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      // 1. L'utente deve essere autenticato
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // 2. Se il ruolo non è ancora popolato (stringa semplice), carica il ruolo
      let role = req.user.role;

      if (typeof role === 'string' || role instanceof String) {
        // Cerca il Role nel database
        const roleDoc = await Role.findOne({ name: role.toLowerCase() }).populate('permissions');
        if (!roleDoc) {
          // Ruolo non trovato nel DB RBAC — fallback retrocompatibile
          if (role === 'admin') {
            // Admin ha sempre accesso completo
            return next();
          }
          return res.status(403).json({
            success: false,
            error: `Role '${role}' not found in RBAC system`
          });
        }
        role = roleDoc;
        // Cache sul request per chiamate successive
        req.user._roleDoc = roleDoc;
      } else if (typeof role === 'object' && role !== null) {
        // Ruolo già popolato — assicurati che permissions siano caricate
        if (!role.populated || !role.populated('permissions')) {
          await role.populate('permissions');
        }
      }

      // 3. Admin ha sempre tutti i permessi
      if (role.name === 'admin') {
        return next();
      }

      // 4. Verifica il permesso specifico
      const hasPerm = role.hasPermission(resource, action);

      if (!hasPerm) {
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions: missing '${action}' on '${resource}'`
        });
      }

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during permission check'
      });
    }
  };
};

/**
 * Middleware che richiede uno o più ruoli specifici (per nome).
 * Alternativa semplificata a hasPermission.
 *
 * Utilizzo:
 *   router.get('/admin/dashboard', auth.verifyToken, rbac.requireRole('admin', 'moderator'), handler);
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = typeof req.user.role === 'object'
      ? req.user.role.name || req.user.role
      : req.user.role;

    const normalizedRole = (userRole || '').toLowerCase();

    if (allowedRoles.map(r => r.toLowerCase()).includes(normalizedRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: `Access denied. Required role(s): ${allowedRoles.join(', ')}`
    });
  };
};

module.exports = { hasPermission, requireRole };
