/**
 * API Response Utility
 * Standardized response formatting for consistent API responses
 * 
 * @module utils/apiResponse
 */

/**
 * HTTP Status codes enum
 */
const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

/**
 * Standard success response
 * 
 * @param {Object} res - Express response object
 * @param {Object} options - Response options
 * @param {number} [options.statusCode=200] - HTTP status code
 * @param {string} [options.message] - Success message
 * @param {*} [options.data] - Response data
 * @param {Object} [options.meta] - Metadata (pagination, etc.)
 */
const success = (res, { statusCode = HttpStatus.OK, message, data, meta } = {}) => {
  const response = {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    ...(meta && { meta }),
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(response);
};

/**
 * Created response (201)
 */
const created = (res, { message = 'Resource created successfully', data, meta } = {}) => {
  return success(res, { statusCode: HttpStatus.CREATED, message, data, meta });
};

/**
 * No content response (204)
 */
const noContent = (res) => {
  return res.status(HttpStatus.NO_CONTENT).end();
};

/**
 * Paginated response
 * 
 * @param {Object} res - Express response object
 * @param {Object} options - Pagination options
 * @param {Array} options.data - Array of items
 * @param {number} options.total - Total count
 * @param {number} options.page - Current page
 * @param {number} options.limit - Items per page
 * @param {string} [options.message] - Optional message
 */
const paginated = (res, { data, total, page, limit, message } = {}) => {
  const totalPages = Math.ceil(total / limit);
  
  return success(res, {
    data,
    message,
    meta: {
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  });
};

/**
 * Error response formatter
 * 
 * @param {Object} res - Express response object
 * @param {Object} options - Error options
 * @param {number} options.statusCode - HTTP status code
 * @param {string} options.code - Error code
 * @param {string} options.message - Error message
 * @param {Array} [options.details] - Validation error details
 * @param {string} [options.requestId] - Request ID for tracing
 */
const error = (res, { statusCode, code, message, details, requestId } = {}) => {
  const response = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(requestId && { requestId }),
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(statusCode).json(response);
};

/**
 * Express response extension
 * Adds convenience methods to res object
 */
const responseEnhancer = (req, res, next) => {
  // Success responses
  res.success = (options) => success(res, options);
  res.created = (options) => created(res, options);
  res.noContent = () => noContent(res);
  res.paginated = (options) => paginated(res, options);
  
  // Error responses
  res.error = (options) => error(res, { ...options, requestId: req.id });
  
  next();
};

module.exports = {
  HttpStatus,
  success,
  created,
  noContent,
  paginated,
  error,
  responseEnhancer,
};
