/**
 * Validators Module Index
 * 
 * Exports all validation schemas and helper middleware.
 */

const { z } = require('zod');
const common = require('./common.validators');
const authValidators = require('./auth.validators');
const userValidators = require('./user.validators');
const lawyerValidators = require('./lawyer.validators');
const consultationValidators = require('./consultation.validators');
const caseValidators = require('./case.validators');
const adminValidators = require('./admin.validators');

/**
 * Create validation middleware from a Zod schema
 * 
 * @param {z.ZodSchema} schema - Zod schema
 * @param {'body'|'query'|'params'} source - Where to get data from
 * @returns {Function} Express middleware
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);
      
      if (!result.success) {
        const { ValidationError } = require('../middleware/errorHandler');
        throw ValidationError.fromZod(result.error);
      }
      
      // Replace with parsed/transformed data
      req[source] = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate body middleware factory
 */
const validateBody = (schema) => validate(schema, 'body');

/**
 * Validate query middleware factory
 */
const validateQuery = (schema) => validate(schema, 'query');

/**
 * Validate params middleware factory
 */
const validateParams = (schema) => validate(schema, 'params');

/**
 * Compose multiple validations
 * 
 * @example
 * app.post('/users/:id', validateAll({
 *   params: userIdSchema,
 *   body: updateUserSchema,
 * }), controller);
 */
const validateAll = (schemas) => {
  const middlewares = [];
  
  if (schemas.params) {
    middlewares.push(validateParams(schemas.params));
  }
  if (schemas.query) {
    middlewares.push(validateQuery(schemas.query));
  }
  if (schemas.body) {
    middlewares.push(validateBody(schemas.body));
  }
  
  return middlewares;
};

module.exports = {
  // Validation middleware
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validateAll,
  
  // Common validators
  ...common,
  
  // Domain-specific validators
  auth: authValidators,
  user: userValidators,
  lawyer: lawyerValidators,
  consultation: consultationValidators,
  case: caseValidators,
  admin: adminValidators,
};
