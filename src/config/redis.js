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

  // Decrement (for rate limiting rollback)
  async decr(key) {
    try {
      const client = createRedisClient();
      const count = await client.decr(key);
      // Ensure count doesn't go below 0
      if (count < 0) {
        await client.set(key, 0);
        return 0;
      }
      return count;
    } catch (error) {
      logger.error('Cache decr error:', error);
      return 0;
    }
  },

  // Set hash field
  async hset(key, field, value, ttlSeconds = null) {
    try {
      const client = createRedisClient();
      await client.hset(key, field, JSON.stringify(value));
      if (ttlSeconds) {
        await client.expire(key, ttlSeconds);
      }
      return true;
    } catch (error) {
      logger.error('Cache hset error:', error);
      return false;
    }
  },

  // Get hash field
  async hget(key, field) {
    try {
      const client = createRedisClient();
      const value = await client.hget(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache hget error:', error);
      return null;
    }
  },

  // Get all hash fields
  async hgetall(key) {
    try {
      const client = createRedisClient();
      const data = await client.hgetall(key);
      if (!data || Object.keys(data).length === 0) return null;
      
      // Parse all values
      const result = {};
      for (const [field, value] of Object.entries(data)) {
        try {
          result[field] = JSON.parse(value);
        } catch {
          result[field] = value;
        }
      }
      return result;
    } catch (error) {
      logger.error('Cache hgetall error:', error);
      return null;
    }
  },

  // Delete hash field
  async hdel(key, field) {
    try {
      const client = createRedisClient();
      await client.hdel(key, field);
      return true;
    } catch (error) {
      logger.error('Cache hdel error:', error);
      return false;
    }
  },

  // Add to set
  async sadd(key, ...members) {
    try {
      const client = createRedisClient();
      return await client.sadd(key, ...members);
    } catch (error) {
      logger.error('Cache sadd error:', error);
      return 0;
    }
  },

  // Remove from set
  async srem(key, ...members) {
    try {
      const client = createRedisClient();
      return await client.srem(key, ...members);
    } catch (error) {
      logger.error('Cache srem error:', error);
      return 0;
    }
  },

  // Get set members
  async smembers(key) {
    try {
      const client = createRedisClient();
      return await client.smembers(key);
    } catch (error) {
      logger.error('Cache smembers error:', error);
      return [];
    }
  },

  // Check if member exists in set
  async sismember(key, member) {
    try {
      const client = createRedisClient();
      return await client.sismember(key, member);
    } catch (error) {
      logger.error('Cache sismember error:', error);
      return false;
    }
  },

  // Set expiry on key
  async expire(key, ttlSeconds) {
    try {
      const client = createRedisClient();
      await client.expire(key, ttlSeconds);
      return true;
    } catch (error) {
      logger.error('Cache expire error:', error);
      return false;
    }
  },

  // Get TTL of key
  async ttl(key) {
    try {
      const client = createRedisClient();
      return await client.ttl(key);
    } catch (error) {
      logger.error('Cache ttl error:', error);
      return -1;
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
  redisClient: createRedisClient(),
  cache,
  checkRedisConnection,
};
