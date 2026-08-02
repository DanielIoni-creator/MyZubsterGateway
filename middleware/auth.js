const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      const message = typeof req.t === 'function' ? req.t('auth.required') : 'Authentication required';
      return res.status(401).json({ error: message });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role || 'user';
    next();
  } catch (error) {
    const message = typeof req.t === 'function' ? req.t('auth.required') : 'Authentication required';
    res.status(401).json({ error: message });
  }
};

// Support both usage patterns:
//   const auth = require('../middleware/auth')           -> auth is the middleware fn
//   const { authenticate } = require('../middleware/auth') -> destructured
module.exports = authenticate;
module.exports.authenticate = authenticate;
