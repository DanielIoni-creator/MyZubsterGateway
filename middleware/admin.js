// Middleware per verificare che l'utente sia admin
const authorizeAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      error: 'Accesso negato. Permessi amministratore richiesti.'
    });
  }
};

// Middleware per registrare le azioni admin senza dipendere da un trasporto opzionale.
const logAdminAction = (action) => {
  return (req, res, next) => {
    const adminId = req.user?.id || req.user?._id || 'unknown';
    const startedAt = new Date().toISOString();

    res.on('finish', () => {
      console.log(JSON.stringify({
        type: 'admin_action',
        adminId,
        action,
        transactionId: req.params?.id,
        startedAt,
        statusCode: res.statusCode,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }));
    });

    next();
  };
};

module.exports = { authorizeAdmin, logAdminAction };
