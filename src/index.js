require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestIdMiddleware } = require('./middleware/requestId');
const { rateLimiter } = require('./middleware/rateLimiter');
const { 
  securityHeaders, 
  sanitizeRequest, 
  detectSqlInjection,
  trackIp,
  validateContentType,
  corsPreflightCache,
  requestTimeout,
} = require('./middleware/security');
const { responseEnhancer } = require('./utils/apiResponse');
const logger = require('./config/logger');

// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const lawyerRoutes = require('./routes/lawyer.routes');
const consultationRoutes = require('./routes/consultation.routes');
const reviewRoutes = require('./routes/review.routes');
const caseRoutes = require('./routes/case.routes');
const reminderRoutes = require('./routes/reminder.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const adminRoutes = require('./routes/admin.routes');
const webhookRoutes = require('./routes/webhook.routes');
const healthRoutes = require('./routes/health.routes');

const app = express();

// Trust proxy for rate limiting behind load balancer
app.set('trust proxy', 1);

// Disable x-powered-by header
app.disable('x-powered-by');

// Request timeout (30 seconds)
app.use(requestTimeout(30000));

// Security middleware - Helmet with strict configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// Additional security headers
app.use(securityHeaders);

// CORS configuration with strict origin validation
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      process.env.FRONTEND_URL,
      'https://nyaaysaathi.com',
      'https://app.nyaaysaathi.com',
      'https://www.nyaaysaathi.com',
    ].filter(Boolean)
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
    ];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn({ message: 'CORS blocked', origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-API-Key',
    'Accept',
    'Accept-Language',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After',
  ],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(corsPreflightCache);

// Request parsing with size limits
app.use(express.json({ 
  limit: '1mb',
  strict: true,
  type: 'application/json',
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '1mb',
  parameterLimit: 100,
}));

// Compression (skip for small responses)
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Request ID for tracing
app.use(requestIdMiddleware);

// Response enhancer (adds helper methods to res)
app.use(responseEnhancer);

// HTTP request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: { write: (message) => logger.info(message.trim()) },
    skip: (req) => req.path === '/health' || req.path === '/health/live',
  }));
}

// IP tracking for abuse detection
app.use(trackIp);

// Content-Type validation
app.use(validateContentType);

// Request sanitization (XSS prevention)
app.use(sanitizeRequest);

// SQL injection detection
app.use(detectSqlInjection);

// Rate limiting (applied globally, specific limits in routes)
app.use(rateLimiter.general);

// Health check routes (no auth required, minimal processing)
app.use('/health', healthRoutes);

// Webhook routes (special handling, placed before general routes)
// Note: Webhooks need raw body for signature verification
app.use('/webhooks', webhookRoutes);

// API routes
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/user', userRoutes);
apiRouter.use('/lawyers', lawyerRoutes);
apiRouter.use('/consultations', consultationRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/cases', caseRoutes);
apiRouter.use('/reminders', reminderRoutes);
apiRouter.use('/chatbot', chatbotRoutes);
apiRouter.use('/admin', adminRoutes);

app.use('/api/v1', apiRouter);

// API documentation redirect
app.get('/api/docs', (req, res) => {
  res.redirect('/api/v1/docs');
});

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Nyaay Saathi API server running on port ${PORT}`);
  logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 API URL: ${process.env.API_URL || `http://localhost:${PORT}`}`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  console.error(error.stack);
  process.exit(1);
});

module.exports = app;
