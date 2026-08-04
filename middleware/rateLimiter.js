/**
 * Rate Limiting Middleware - Bounty B15
 * Configurable rate limiting per IP and endpoint with standard headers.
 */

const rateLimitStore = new Map(); // { key: { count, resetTime } }

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

function rateLimiter(options = {}) {
  const {
    windowMs = parseInt(process.env.RATE_LIMIT_WINDOW) * 1000 || 60000,
    max = parseInt(process.env.RATE_LIMIT_MAX) || 100,
    keyBy = 'ip'
  } = options;

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const endpoint = req.originalUrl || req.url;
    const key = keyBy === 'ip+endpoint' ? `${ip}:${endpoint}` : ip;

    const now = Date.now();
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    const remaining = Math.max(0, max - entry.count);
    const reset = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', reset);
    res.setHeader('X-RateLimit-Key', keyBy === 'ip+endpoint' ? endpoint : 'global');

    if (entry.count > max) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${reset} seconds.`,
        retryAfter: reset,
        limit: max,
        remaining: 0
      });
    }

    next();
  };
}

function getRateLimitStats() {
  const now = Date.now();
  const stats = [];
  for (const [key, entry] of rateLimitStore) {
    if (now <= entry.resetTime) {
      stats.push({ key, count: entry.count, resetTime: new Date(entry.resetTime).toISOString() });
    }
  }
  return {
    totalTracked: stats.length,
    entries: stats,
    timestamp: new Date().toISOString()
  };
}

function resetRateLimit(key) {
  return rateLimitStore.delete(key);
}

module.exports = { rateLimiter, getRateLimitStats, resetRateLimit };
