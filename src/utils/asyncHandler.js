/**
 * Async Handler Utility
 * Wraps async controller methods to automatically catch errors
 * and forward them to Express error handling middleware
 * 
 * @module utils/asyncHandler
 */

/**
 * Wraps an async function to catch any errors and pass them to next()
 * Eliminates the need for try-catch blocks in every controller method
 * 
 * @param {Function} fn - Async function to wrap (req, res, next) => Promise
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Instead of:
 * async getUser(req, res, next) {
 *   try {
 *     const user = await User.findById(req.params.id);
 *     res.json(user);
 *   } catch (error) {
 *     next(error);
 *   }
 * }
 * 
 * // Use:
 * getUser = asyncHandler(async (req, res) => {
 *   const user = await User.findById(req.params.id);
 *   res.json(user);
 * });
 */
const asyncHandler = (fn) => {
  if (typeof fn !== 'function') {
    throw new TypeError('asyncHandler requires a function argument');
  }

  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Enhance error with request context if not already present
      if (!error.requestId) {
        error.requestId = req.id;
      }
      next(error);
    });
  };
};

/**
 * Wraps a class method to be used with asyncHandler
 * Useful for controller classes
 * 
 * @param {Object} target - The class instance
 * @param {string} methodName - Name of the method to wrap
 * @returns {Function} Wrapped method
 */
const wrapMethod = (target, methodName) => {
  const originalMethod = target[methodName];
  if (typeof originalMethod !== 'function') {
    throw new TypeError(`${methodName} is not a function`);
  }
  return asyncHandler(originalMethod.bind(target));
};

/**
 * Class decorator to wrap all async methods with error handling
 * 
 * @param {Object} instance - Class instance
 * @param {string[]} methods - Array of method names to wrap
 * @returns {Object} Instance with wrapped methods
 */
const wrapController = (instance, methods) => {
  const wrapped = {};
  
  methods.forEach((method) => {
    if (typeof instance[method] === 'function') {
      wrapped[method] = asyncHandler(instance[method].bind(instance));
    }
  });

  return wrapped;
};

module.exports = {
  asyncHandler,
  wrapMethod,
  wrapController,
};
