const rateLimit = require('express-rate-limit');
const { cache } = require('../config/redis');
const logger = require('../config/logger');

// Custom rate limit store using Redis
class RedisStore {
  constructor(windowMs) {
    this.windowMs = windowMs;
  }

  async increment(key) {
    const ttlSeconds = Math.ceil(this.windowMs / 1000);
    const count = await cache.incr(`ratelimit:${key}`, ttlSeconds);
    return {
      totalHits: count,
      resetTime: new Date(Date.now() + this.windowMs),
    };
  }

  async decrement(key) {
    // Not implemented for simplicity
  }

  async resetKey(key) {
    await cache.del(`ratelimit:${key}`);
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

module.exports = {
  rateLimiter: {
    general,
    auth,
    otp,
    search,
    chatbot,
    admin,
    webhook,
  },
};
