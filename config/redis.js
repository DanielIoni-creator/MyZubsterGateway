const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

let redisClient = null;
let redisAvailable = false;

async function getRedisClient() {
  if (!REDIS_ENABLED) return null;
  if (redisClient) return redisClient;

  try {
    const Redis = require('ioredis');
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
      redisAvailable = true;
    });

    redisClient.on('error', (err) => {
      console.warn('⚠️ Redis error (falling back to DB):', err.message);
      redisAvailable = false;
    });

    await redisClient.connect();
    redisAvailable = true;
    return redisClient;
  } catch (err) {
    console.warn('⚠️ Redis not available (falling back to DB):', err.message);
    redisAvailable = false;
    return null;
  }
}

function isRedisAvailable() {
  return redisAvailable && redisClient !== null;
}

module.exports = { getRedisClient, isRedisAvailable, REDIS_ENABLED };
