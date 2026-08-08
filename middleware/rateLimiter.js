const store = new Map();

function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 60000;
  const max = options.max || 100;
  const keyBy = options.keyBy;

  return (req, res, next) => {
    const ip = req.ip ||
      (req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For'])) ||
      (req.connection && req.connection.remoteAddress) ||
      '127.0.0.1';

    const endpoint = req.originalUrl || req.url || '';

    let key;
    if (typeof keyBy === 'function') {
      key = keyBy(req);
    } else if (keyBy === 'ip+endpoint') {
      key = `${ip}:${endpoint}`;
    } else {
      key = ip;
    }

    const now = Date.now();
    let record = store.get(key);

    if (!record || now >= record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
    } else {
      record.count += 1;
    }

    store.set(key, record);

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
    }

    if (record.count > max) {
      if (res && typeof res.status === 'function') {
        const resStatus = res.status(429);
        if (resStatus && typeof resStatus.json === 'function') {
          resStatus.json({ error: 'Too Many Requests' });
        }
      }
      if (typeof next === 'function') {
        next();
      }
      return;
    }

    if (typeof next === 'function') {
      next();
    }
  };
}

function getRateLimitStats() {
  const entries = [];
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now >= record.resetTime) {
      store.delete(key);
    } else {
      entries.push({ key, count: record.count, resetTime: record.resetTime });
    }
  }
  return { entries };
}

function resetRateLimit(key) {
  if (key) {
    store.delete(key);
  } else {
    store.clear();
  }
}

module.exports = {
  rateLimiter,
  getRateLimitStats,
  resetRateLimit
};
const store = new Map();

function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 60000;
  const max = options.max || 5;
  const keyBy = options.keyBy || 'ip';

  return (req, res, next) => {
    const ip = req.ip || (req.connection && req.connection.remoteAddress) || '127.0.0.1';
    const key = keyBy === 'ip+endpoint' ? `${ip}:${req.originalUrl || ''}` : ip;

    const now = Date.now();
    let record = store.get(key);

    if (!record || now >= record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs,
        limit: max
      };
      store.set(key, record);
    }

    if (record.count >= max) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
      return res.status(429).json({ error: 'Too Many Requests' });
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - record.count);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    next();
  };
}

function getRateLimitStats() {
  const entries = [];
  for (const [key, record] of store.entries()) {
    entries.push({
      key,
      count: record.count,
      resetTime: record.resetTime,
      limit: record.limit,
      remaining: Math.max(0, record.limit - record.count)
    });
  }
  return { entries };
}

function resetRateLimit() {
  store.clear();
}

module.exports = {
  rateLimiter,
  getRateLimitStats,
  resetRateLimit
};
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
