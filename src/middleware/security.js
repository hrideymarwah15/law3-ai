/**
 * Security Middleware
 * Advanced security measures for production API
 * 
 * @module middleware/security
 */

const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Security headers middleware
 * Adds additional security headers beyond Helmet defaults
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Cache control for API responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  next();
};

/**
 * Request sanitization middleware
 * Sanitizes request body, query, and params to prevent XSS and injection attacks
 */
const sanitizeRequest = (req, res, next) => {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove null bytes
      value = value.replace(/\0/g, '');
      
      // Trim excessive whitespace
      value = value.trim();
      
      // Basic HTML entity encoding for common XSS vectors
      // Note: For display, use a proper sanitization library like DOMPurify on frontend
      value = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
      
      return value;
    }
    return value;
  };

  const sanitizeObject = (obj, depth = 0) => {
    // Prevent infinite recursion
    if (depth > 10) return obj;
    
    if (obj === null || obj === undefined) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item, depth + 1));
    }
    
    if (typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip sanitization for specific fields that need raw values
        const skipFields = ['password', 'token', 'signature', 'razorpay_signature'];
        if (skipFields.includes(key)) {
          sanitized[key] = value;
        } else {
          sanitized[key] = sanitizeObject(value, depth + 1);
        }
      }
      return sanitized;
    }
    
    return sanitizeValue(obj);
  };

  // Sanitize body, query, and params (but not for webhook routes)
  if (!req.path.startsWith('/webhooks')) {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
  }
  
  next();
};

/**
 * SQL Injection prevention patterns
 * Additional layer of protection (Supabase already uses parameterized queries)
 */
const sqlInjectionPatterns = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  /((\%27)|(\'))union/i,
  /exec(\s|\+)+(s|x)p\w+/i,
  /UNION(\s+)ALL(\s+)SELECT/i,
  /UNION(\s+)SELECT/i,
  /INSERT(\s+)INTO/i,
  /DELETE(\s+)FROM/i,
  /DROP(\s+)TABLE/i,
  /UPDATE(\s+)\w+(\s+)SET/i,
];

/**
 * SQL Injection detection middleware
 */
const detectSqlInjection = (req, res, next) => {
  const checkValue = (value, location) => {
    if (typeof value !== 'string') return false;
    
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(value)) {
        logger.warn({
          message: 'Potential SQL injection detected',
          ip: req.ip,
          path: req.path,
          location,
          requestId: req.id,
        });
        return true;
      }
    }
    return false;
  };

  const checkObject = (obj, location) => {
    if (!obj || typeof obj !== 'object') return false;
    
    for (const [key, value] of Object.entries(obj)) {
      if (checkValue(key, location)) return true;
      if (typeof value === 'string' && checkValue(value, location)) return true;
      if (typeof value === 'object' && checkObject(value, location)) return true;
    }
    return false;
  };

  // Skip for webhook routes (they need raw data)
  if (req.path.startsWith('/webhooks')) {
    return next();
  }

  if (
    checkObject(req.body, 'body') ||
    checkObject(req.query, 'query') ||
    checkObject(req.params, 'params')
  ) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Request contains invalid characters',
        requestId: req.id,
      },
    });
  }

  next();
};

/**
 * Request size limiter
 * Different limits for different content types
 */
const requestSizeLimiter = {
  json: '1mb',
  urlencoded: '1mb',
  text: '100kb',
  raw: '5mb',
};

/**
 * IP-based request tracking for abuse detection
 */
const ipTracker = new Map();
const IP_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

const trackIp = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!ipTracker.has(ip)) {
    ipTracker.set(ip, { count: 1, windowStart: now });
  } else {
    const tracker = ipTracker.get(ip);
    
    // Reset window if expired
    if (now - tracker.windowStart > IP_WINDOW_MS) {
      tracker.count = 1;
      tracker.windowStart = now;
    } else {
      tracker.count++;
    }
    
    // Log high-frequency IPs (potential abuse)
    if (tracker.count > MAX_REQUESTS_PER_WINDOW * 0.8) {
      logger.warn({
        message: 'High request frequency detected',
        ip,
        count: tracker.count,
        requestId: req.id,
      });
    }
  }
  
  next();
};

// Cleanup old IP tracking entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, tracker] of ipTracker.entries()) {
    if (now - tracker.windowStart > IP_WINDOW_MS * 2) {
      ipTracker.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

/**
 * Content-Type validation middleware
 */
const validateContentType = (req, res, next) => {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip for routes that don't need body
  if (req.path.startsWith('/health')) {
    return next();
  }
  
  const contentType = req.get('Content-Type');
  
  // Require Content-Type for POST, PUT, PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !contentType) {
    return res.status(415).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'Content-Type header is required',
        requestId: req.id,
      },
    });
  }
  
  // Allow only specific content types
  const allowedTypes = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'];
  const isAllowed = allowedTypes.some(type => contentType?.includes(type));
  
  if (contentType && !isAllowed) {
    return res.status(415).json({
      success: false,
      error: {
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: `Content-Type ${contentType} is not supported`,
        requestId: req.id,
      },
    });
  }
  
  next();
};

/**
 * Sensitive data masking in responses
 */
const sensitiveFields = ['password', 'otp', 'token', 'secret', 'key', 'signature'];

const maskSensitiveData = (obj, depth = 0) => {
  if (depth > 10 || !obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item, depth + 1));
  }
  
  const masked = { ...obj };
  for (const [key, value] of Object.entries(masked)) {
    const keyLower = key.toLowerCase();
    if (sensitiveFields.some(field => keyLower.includes(field))) {
      masked[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      masked[key] = maskSensitiveData(value, depth + 1);
    }
  }
  
  return masked;
};

/**
 * CORS preflight cache
 */
const corsPreflightCache = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }
  next();
};

/**
 * API Key authentication for service-to-service calls
 */
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.get('X-API-Key');
  const expectedKey = process.env.INTERNAL_API_KEY;
  
  // Skip if no internal API key is configured
  if (!expectedKey) {
    return next();
  }
  
  // Check if route requires API key
  const apiKeyRoutes = ['/webhooks', '/internal'];
  const requiresApiKey = apiKeyRoutes.some(route => req.path.startsWith(route));
  
  if (requiresApiKey && apiKey !== expectedKey) {
    logger.warn({
      message: 'Invalid API key',
      ip: req.ip,
      path: req.path,
      requestId: req.id,
    });
    
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid or missing API key',
        requestId: req.id,
      },
    });
  }
  
  next();
};

/**
 * Request timeout middleware
 */
const requestTimeout = (timeoutMs = 30000) => (req, res, next) => {
  req.setTimeout(timeoutMs, () => {
    logger.warn({
      message: 'Request timeout',
      path: req.path,
      method: req.method,
      requestId: req.id,
    });
    
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Request timed out',
          requestId: req.id,
        },
      });
    }
  });
  
  next();
};

/**
 * Nonce generator for CSP
 */
const generateNonce = () => {
  return crypto.randomBytes(16).toString('base64');
};

module.exports = {
  securityHeaders,
  sanitizeRequest,
  detectSqlInjection,
  requestSizeLimiter,
  trackIp,
  validateContentType,
  maskSensitiveData,
  corsPreflightCache,
  apiKeyAuth,
  requestTimeout,
  generateNonce,
};
