/**
 * Input Sanitization Middleware
 * Sanitizes user input to prevent XSS and injection attacks.
 */

const sanitizeInput = (req, res, next) => {
  const sanitize = (value) => {
    if (typeof value === 'string') {
      // Remove HTML tags
      return value
        .replace(/<[^>]*>/g, '')
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitize(val);
      }
      return sanitized;
    }
    if (Array.isArray(value)) {
      return value.map(sanitize);
    }
    return value;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);

  next();
};

module.exports = sanitizeInput;
