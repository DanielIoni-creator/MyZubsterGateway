// middleware/admin.js
const { getIO } = require('../services/websocket');

// Middleware per verificare che l'utente sia admin
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      error: req.t('auth.adminRequired')
    });
  }
};

// Middleware per registrare le azioni admin
const logAdminAction = (action) => {
  return (req, res, next) => {
    const io = getIO();
    const adminId = req.user?.id || 'unknown';
    console.log(`🛡️ Admin ${adminId}: ${action}`);
    
    // Emetti evento WebSocket per tracciare le azioni admin
    io.to('admin_actions').emit('admin:action', {
      adminId,
      action,
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    next();
  };
};

module.exports = { authorizeAdmin, logAdminAction };
