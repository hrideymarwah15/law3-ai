const logger = require('../config/logger');

/**
 * Error Code Constants
 * Standardized error codes for client consumption
 */
const ErrorCodes = {
  // Client Errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNPROCESSABLE_ENTITY: 'UNPROCESSABLE_ENTITY',
  
  // Server Errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
};

/**
 * Base Application Error
 * All custom errors extend this class
 */
class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {string} code - Error code from ErrorCodes
   * @param {Object} options - Additional options
   */
  constructor(message, statusCode, code = ErrorCodes.INTERNAL_ERROR, options = {}) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Operational errors are expected errors
    this.details = options.details || null;
    this.meta = options.meta || null;
    
    // Capture stack trace, excluding constructor call
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack,
    };
  }
}

/**
 * Validation Error (400)
 * Used for request validation failures
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = []) {
    super(message, 400, ErrorCodes.VALIDATION_ERROR, { details });
    this.details = details;
  }

  /**
   * Create from Zod error
   * @param {Object} zodError - Zod validation error
   * @returns {ValidationError}
   */
  static fromZod(zodError) {
    const details = zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
    return new ValidationError('Invalid request data', details);
  }
}

/**
 * Unauthorized Error (401)
 * Used when authentication is required but not provided or invalid
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, ErrorCodes.UNAUTHORIZED);
  }
}

/**
 * Forbidden Error (403)
 * Used when user is authenticated but lacks permission
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, ErrorCodes.FORBIDDEN);
  }
}

/**
 * Not Found Error (404)
 * Used when requested resource doesn't exist
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, ErrorCodes.NOT_FOUND);
  }
}

/**
 * Conflict Error (409)
 * Used when there's a conflict with current state (e.g., duplicate entry)
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, ErrorCodes.CONFLICT);
  }
}

/**
 * Rate Limit Error (429)
 * Used when request limit is exceeded
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message, 429, ErrorCodes.RATE_LIMIT_EXCEEDED, {
      meta: { retryAfter },
    });
    this.retryAfter = retryAfter;
  }
}

/**
 * Unprocessable Entity Error (422)
 * Used when request is valid but cannot be processed
 */
class UnprocessableEntityError extends AppError {
  constructor(message = 'Request cannot be processed') {
    super(message, 422, ErrorCodes.UNPROCESSABLE_ENTITY);
  }
}

/**
 * External Service Error (502)
 * Used when external service (payment, SMS, etc.) fails
 */
class ExternalServiceError extends AppError {
  constructor(message = 'External service unavailable', service = 'unknown') {
    super(message, 502, ErrorCodes.EXTERNAL_SERVICE_ERROR, {
      meta: { service },
    });
    this.service = service;
  }
}

/**
 * Database Error (500)
 * Used for database-related errors
 */
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, ErrorCodes.DATABASE_ERROR);
    this.originalError = originalError;
  }
}

/**
 * Service Unavailable Error (503)
 * Used when service is temporarily unavailable
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, ErrorCodes.SERVICE_UNAVAILABLE);
  }
}

/**
 * 404 Not Found Handler
 * Catches requests to undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
  next(error);
};

/**
 * Global Error Handler
 * Processes all errors and returns consistent response format
 */
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let code = err.code || ErrorCodes.INTERNAL_ERROR;
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle specific error types
  if (err.name === 'ZodError') {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Invalid request data';
    details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = ErrorCodes.UNAUTHORIZED;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = ErrorCodes.UNAUTHORIZED;
    message = 'Token expired';
  } else if (err.code === '23505') {
    // PostgreSQL unique violation
    statusCode = 409;
    code = ErrorCodes.CONFLICT;
    message = 'Resource already exists';
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Referenced resource does not exist';
  } else if (err.code === 'PGRST116') {
    // Supabase not found
    statusCode = 404;
    code = ErrorCodes.NOT_FOUND;
    message = 'Resource not found';
  }

  // Log error context
  const logContext = {
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: message,
    code,
  };

  // Log based on error type
  if (err.isOperational) {
    logger.warn(logContext);
  } else {
    logger.error({ ...logContext, stack: err.stack });
  }

  // Production mode: hide internal error details
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && statusCode === 500 && !err.isOperational) {
    message = 'An unexpected error occurred';
    details = null;
  }

  // Build response
  const errorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(err.retryAfter && { retryAfter: err.retryAfter }),
      requestId: req.id,
      timestamp: new Date().toISOString(),
    },
  };

  // Include stack in development
  if (!isProduction && statusCode >= 500) {
    errorResponse.error.stack = err.stack;
  }

  // Set headers
  if (err.retryAfter) {
    res.setHeader('Retry-After', err.retryAfter);
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Async Handler Wrapper
 * Wraps async functions to automatically catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Error Factory
 * Creates appropriate error based on status code
 */
const createError = (statusCode, message, options = {}) => {
  switch (statusCode) {
    case 400:
      return new ValidationError(message, options.details);
    case 401:
      return new UnauthorizedError(message);
    case 403:
      return new ForbiddenError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message);
    case 422:
      return new UnprocessableEntityError(message);
    case 429:
      return new RateLimitError(message, options.retryAfter);
    case 502:
      return new ExternalServiceError(message, options.service);
    case 503:
      return new ServiceUnavailableError(message);
    default:
      return new AppError(message, statusCode, ErrorCodes.INTERNAL_ERROR, options);
  }
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  UnprocessableEntityError,
  ExternalServiceError,
  DatabaseError,
  ServiceUnavailableError,
  
  // Error codes
  ErrorCodes,
  
  // Middleware
  notFoundHandler,
  errorHandler,
  
  // Utilities
  asyncHandler,
  createError,
};
