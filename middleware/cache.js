const { getRedisClient, isRedisAvailable } = require('../config/redis');

const DEFAULT_TTLS = {
  '/api/rewards': 30,
  '/api/robot/status': 15,
  '/api/bounty/list': 60,
};

function cacheMiddleware(options = {}) {
  const { ttl = 30, keyPrefix = 'cache' } = options;
  return async (req, res, next) => {
    if (!isRedisAvailable()) return next();
    const redis = await getRedisClient();
    if (!redis) return next();
    const cacheKey = keyPrefix + ':' + (req.originalUrl || req.url);
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cached));
      }
      const originalJson = res.json.bind(res);
      res.json = function (body) {
        redis.set(cacheKey, JSON.stringify(body), 'EX', ttl).catch(() => {});
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };
      next();
    } catch (err) { next(); }
  };
}

async function invalidateCache(pattern) {
  if (!isRedisAvailable()) return;
  const redis = await getRedisClient();
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) { await redis.del(...keys); }
  } catch (err) {}
}

function autoInvalidate(resource) {
  const patterns = { reward: 'cache:/api/rewards*', bounty: 'cache:/api/bounty*', robot: 'cache:/api/robot*' };
  const pattern = patterns[resource];
  if (pattern) invalidateCache(pattern);
}

module.exports = { cacheMiddleware, invalidateCache, autoInvalidate };
