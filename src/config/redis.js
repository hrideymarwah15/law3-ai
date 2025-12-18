const Redis = require('ioredis');
const logger = require('./logger');

let redis = null;

const createRedisClient = () => {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redis = new Redis(redisUrl, {
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true,
    enableReadyCheck: true,
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        return true;
      }
      return false;
    },
  });

  redis.on('connect', () => {
    logger.info('Redis client connected');
  });

  redis.on('error', (err) => {
    logger.error('Redis client error:', err);
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return redis;
};

// Cache wrapper with TTL
const cache = {
  async get(key) {
    try {
      const client = createRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  },

  async set(key, value, ttlSeconds = 300) {
    try {
      const client = createRedisClient();
      await client.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  },

  async del(key) {
    try {
      const client = createRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  },

  async delPattern(pattern) {
    try {
      const client = createRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
      return true;
    } catch (error) {
      logger.error('Cache delete pattern error:', error);
      return false;
    }
  },

  async exists(key) {
    try {
      const client = createRedisClient();
      return await client.exists(key);
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  },

  // Increment with expiry (for rate limiting)
  async incr(key, ttlSeconds = 60) {
    try {
      const client = createRedisClient();
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, ttlSeconds);
      }
      return count;
    } catch (error) {
      logger.error('Cache incr error:', error);
      return 0;
    }
  },
};

// Check Redis connection health
const checkRedisConnection = async () => {
  try {
    const client = createRedisClient();
    const start = Date.now();
    await client.ping();
    return { status: 'healthy', latency: Date.now() - start };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

module.exports = {
  createRedisClient,
  cache,
  checkRedisConnection,
};
