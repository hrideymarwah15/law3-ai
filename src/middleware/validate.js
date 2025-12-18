const { ValidationError } = require('./errorHandler');

/**
 * Validate request using Zod schema
 * @param {Object} schema - Zod schema with body, params, query
 */
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    // Validate body
    if (schema.body) {
      const result = schema.body.safeParse(req.body);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'body'));
      } else {
        req.body = result.data; // Use parsed/transformed data
      }
    }

    // Validate params
    if (schema.params) {
      const result = schema.params.safeParse(req.params);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'params'));
      } else {
        req.params = result.data;
      }
    }

    // Validate query
    if (schema.query) {
      const result = schema.query.safeParse(req.query);
      if (!result.success) {
        errors.push(...formatZodErrors(result.error, 'query'));
      } else {
        req.query = result.data;
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError('Invalid request data', errors));
    }

    next();
  };
};

/**
 * Format Zod errors into consistent structure
 */
const formatZodErrors = (zodError, location) => {
  return zodError.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
    location,
  }));
};

module.exports = { validate };
