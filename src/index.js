require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestIdMiddleware } = require('./middleware/requestId');
const { rateLimiter } = require('./middleware/rateLimiter');
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

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://nyaaysaathi.com', 'https://app.nyaaysaathi.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
};
app.use(cors(corsOptions));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
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

// HTTP request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }));
}

// Rate limiting (applied globally, specific limits in routes)
app.use(rateLimiter.general);

// Health check routes (no auth required)
app.use('/health', healthRoutes);

// Webhook routes (special handling, placed before general routes)
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

// Global error handler
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
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
