const logger = require('../config/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class ExternalServiceError extends AppError {
  constructor(message = 'External service error', service = 'unknown') {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

// 404 Not Found handler
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  // Log error
  const logContext = {
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip,
  };

  if (err.isOperational) {
    logger.warn({ ...logContext, error: err.message, code: err.code });
  } else {
    logger.error({ ...logContext, error: err.message, stack: err.stack });
  }

  // Determine status code
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Build error response
  const errorResponse = {
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: isProduction && statusCode === 500 
        ? 'An unexpected error occurred' 
        : err.message,
      ...(err.details && { details: err.details }),
      requestId: req.id,
      timestamp: new Date().toISOString(),
    },
  };

  // Include stack trace in development
  if (!isProduction && statusCode === 500) {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// Async handler wrapper to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
};
