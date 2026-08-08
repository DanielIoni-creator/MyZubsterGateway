// Redis Cache Service - Bounty B16
const Redis = require('ioredis');

let redis = null;
let connected = false;

async function connect() {
  if (connected && redis) return redis;
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    redis = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
    await redis.connect();
    connected = true;
    console.log('[Cache] Connected to Redis');
    return redis;
  } catch (err) {
    console.warn('[Cache] Redis unavailable, caching disabled:', err.message);
    redis = null;
    connected = false;
    return null;
  }
}

async function get(key) {
  if (!connected) return null;
  try { const v = await redis.get(key); return v ? JSON.parse(v) : null; }
  catch { return null; }
}

async function set(key, value, ttlSeconds) {
  if (!connected) return false;
  try {
    const s = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) await redis.setex(key, ttlSeconds, s);
    else await redis.set(key, s);
    return true;
  } catch { return false; }
}

async function del(pattern) {
  if (!connected) return 0;
  try {
    const keys = await redis.keys(pattern);
    return keys.length > 0 ? await redis.del(...keys) : 0;
  } catch { return 0; }
}

function cacheMiddleware(prefix, ttlSeconds) {
  return async (req, res, next) => {
    if (!connected) return next();
    const key = prefix + ':' + (req.originalUrl || req.url);
    try {
      const cached = await get(key);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(cached);
      }
      const origJson = res.json.bind(res);
      res.json = function(body) {
        set(key, body, ttlSeconds || 60).catch(function(){});
        res.setHeader('X-Cache', 'MISS');
        return origJson(body);
      };
      next();
    } catch (e) { next(); }
  };
}

async function getStats() {
  if (!connected) return { connected: false };
  try {
    const dbsize = await redis.dbsize();
    return { connected: true, dbsize: dbsize };
  } catch { return { connected: false }; }
}

connect();

module.exports = { connect, get, set, del, cacheMiddleware, getStats };
