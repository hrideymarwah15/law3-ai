const rateLimit = require('express-rate-limit');
const { cache } = require('../config/redis');
const logger = require('../config/logger');

/**
 * Custom Redis-based rate limit store
 * Provides distributed rate limiting across multiple server instances
 */
class RedisStore {
  constructor(windowMs) {
    this.windowMs = windowMs;
    this.prefix = 'ratelimit:';
  }

  /**
   * Increment the hit counter for a key
   * @param {string} key - The rate limit key
   * @returns {Promise<{totalHits: number, resetTime: Date}>}
   */
  async increment(key) {
    const ttlSeconds = Math.ceil(this.windowMs / 1000);
    const fullKey = `${this.prefix}${key}`;
    
    try {
      const count = await cache.incr(fullKey, ttlSeconds);
      return {
        totalHits: count,
        resetTime: new Date(Date.now() + this.windowMs),
      };
    } catch (error) {
      logger.error({ 
        message: 'Rate limit increment failed', 
        error: error.message, 
        key 
      });
      // Fail open - allow request if Redis is down
      return {
        totalHits: 0,
        resetTime: new Date(Date.now() + this.windowMs),
      };
    }
  }

  /**
   * Decrement the hit counter for a key
   * Used when a request should not count against the limit (e.g., successful response)
   * @param {string} key - The rate limit key
   */
  async decrement(key) {
    const fullKey = `${this.prefix}${key}`;
    
    try {
      const current = await cache.get(fullKey);
      if (current && parseInt(current) > 0) {
        await cache.decr(fullKey);
      }
    } catch (error) {
      logger.error({ 
        message: 'Rate limit decrement failed', 
        error: error.message, 
        key 
      });
      // Fail silently - decrement failure is not critical
    }
  }

  /**
   * Reset the hit counter for a key
   * @param {string} key - The rate limit key
   */
  async resetKey(key) {
    const fullKey = `${this.prefix}${key}`;
    
    try {
      await cache.del(fullKey);
    } catch (error) {
      logger.error({ 
        message: 'Rate limit reset failed', 
        error: error.message, 
        key 
      });
    }
  }

  /**
   * Get current hit count for a key (for monitoring)
   * @param {string} key - The rate limit key
   * @returns {Promise<number>}
   */
  async getHits(key) {
    const fullKey = `${this.prefix}${key}`;
    
    try {
      const hits = await cache.get(fullKey);
      return hits ? parseInt(hits) : 0;
    } catch (error) {
      return 0;
    }
  }
}

// Key generator functions
const getIpKey = (req) => {
  return req.ip || req.connection.remoteAddress || 'unknown';
};

const getUserKey = (req) => {
  return req.user?.id || getIpKey(req);
};

const getPhoneKey = (req) => {
  return req.body?.phone || getIpKey(req);
};

// Rate limit response handler
const rateLimitHandler = (req, res) => {
  logger.warn({
    message: 'Rate limit exceeded',
    ip: req.ip,
    path: req.path,
    userId: req.user?.id,
  });

  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    },
  });
};

// General API rate limiter
const general = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserKey,
  handler: rateLimitHandler,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path.startsWith('/health');
  },
});

// Strict rate limiter for auth endpoints
const auth = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getIpKey,
  handler: rateLimitHandler,
  message: 'Too many authentication attempts. Please wait a minute.',
});

// OTP rate limiter (per phone number)
const otp = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getPhoneKey,
  handler: rateLimitHandler,
  message: 'Too many OTP requests. Please wait a minute.',
});

// Search rate limiter
const search = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getIpKey,
  handler: rateLimitHandler,
});

// Chatbot rate limiter
const chatbot = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.body?.session_id || getUserKey(req),
  handler: rateLimitHandler,
});

// Admin rate limiter (more generous)
const admin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserKey,
  handler: rateLimitHandler,
});

// Webhook rate limiter (very generous for payment webhooks)
const webhook = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getIpKey,
  handler: rateLimitHandler,
});

// Chat message rate limiter
const message = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUserKey,
  handler: rateLimitHandler,
  message: 'Too many messages. Please slow down.',
});

// Export both grouped and individual limiters for flexibility
module.exports = {
  rateLimiter: {
    general,
    auth,
    otp,
    search,
    chatbot,
    admin,
    webhook,
    message,
  },
  // Individual exports for direct use in routes
  generalLimiter: general,
  authLimiter: auth,
  otpLimiter: otp,
  searchLimiter: search,
  chatbotLimiter: chatbot,
  adminLimiter: admin,
  webhookLimiter: webhook,
  messageLimiter: message,
};
