/**
 * Base Service Class
 * 
 * Provides common service functionality including:
 * - Repository access
 * - Event emission
 * - Audit logging
 * - Transaction support
 * 
 * @abstract
 */

const { EventEmitter } = require('events');
const logger = require('../config/logger');

class BaseService extends EventEmitter {
  /**
   * @param {Object} options - Service options
   * @param {Object} options.repository - Primary repository for this service
   * @param {Object} [options.dependencies] - Additional service dependencies
   */
  constructor(options = {}) {
    super();
    this.repository = options.repository;
    this.dependencies = options.dependencies || {};
    this.serviceName = this.constructor.name;
    
    // Set max listeners to avoid memory leak warnings
    this.setMaxListeners(20);
  }

  /**
   * Get logger with service context
   * @returns {Object} Logger instance
   */
  get log() {
    return logger.child({ service: this.serviceName });
  }

  /**
   * Execute operation with audit logging
   * @param {string} operation - Operation name
   * @param {Object} context - Operation context (userId, etc.)
   * @param {Function} fn - Operation function
   * @returns {Promise<any>} Operation result
   */
  async withAudit(operation, context, fn) {
    const startTime = Date.now();
    const auditEntry = {
      operation,
      service: this.serviceName,
      ...context,
      startedAt: new Date().toISOString(),
    };

    try {
      const result = await fn();
      
      const duration = Date.now() - startTime;
      this.log.info({
        ...auditEntry,
        status: 'success',
        duration,
      });
      
      this.emit('audit', {
        ...auditEntry,
        status: 'success',
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log.error({
        ...auditEntry,
        status: 'error',
        error: error.message,
        duration,
      });
      
      this.emit('audit', {
        ...auditEntry,
        status: 'error',
        error: error.message,
        duration,
      });

      throw error;
    }
  }

  /**
   * Execute multiple operations in a transaction-like manner
   * Note: Supabase doesn't support true transactions via REST API,
   * so this provides rollback logic via compensation actions
   * 
   * @param {Array<{execute: Function, compensate: Function}>} operations
   * @returns {Promise<Array>} Results array
   */
  async executeWithCompensation(operations) {
    const executedOps = [];
    const results = [];

    try {
      for (const op of operations) {
        const result = await op.execute();
        results.push(result);
        executedOps.push({ ...op, result });
      }
      return results;
    } catch (error) {
      // Rollback in reverse order
      this.log.warn({
        message: 'Initiating compensation rollback',
        completedOps: executedOps.length,
        totalOps: operations.length,
      });

      for (let i = executedOps.length - 1; i >= 0; i--) {
        try {
          if (executedOps[i].compensate) {
            await executedOps[i].compensate(executedOps[i].result);
          }
        } catch (compensationError) {
          this.log.error({
            message: 'Compensation failed',
            operation: i,
            error: compensationError.message,
          });
        }
      }

      throw error;
    }
  }

  /**
   * Retry an operation with exponential backoff
   * @param {Function} fn - Function to retry
   * @param {Object} [options] - Retry options
   * @param {number} [options.maxRetries=3] - Maximum retry attempts
   * @param {number} [options.baseDelay=1000] - Base delay in ms
   * @param {number} [options.maxDelay=10000] - Maximum delay in ms
   * @param {Function} [options.shouldRetry] - Custom retry condition
   * @returns {Promise<any>} Function result
   */
  async withRetry(fn, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      shouldRetry = (error) => error.code === 'NETWORK_ERROR' || error.status >= 500,
    } = options;

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries || !shouldRetry(error)) {
          throw error;
        }

        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        this.log.warn({
          message: 'Retrying operation',
          attempt: attempt + 1,
          maxRetries,
          delay,
          error: error.message,
        });

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Execute operation with timeout
   * @param {Function} fn - Async function to execute
   * @param {number} timeout - Timeout in milliseconds
   * @param {string} [operationName='Operation'] - Name for error message
   * @returns {Promise<any>}
   */
  async withTimeout(fn, timeout, operationName = 'Operation') {
    return Promise.race([
      fn(),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${operationName} timed out after ${timeout}ms`));
        }, timeout);
      }),
    ]);
  }

  /**
   * Rate limit operations (simple token bucket)
   * @param {string} key - Rate limit key
   * @param {number} maxTokens - Maximum tokens
   * @param {number} refillRate - Tokens per second
   * @returns {Promise<boolean>} Whether operation is allowed
   */
  async checkRateLimit(key, maxTokens = 10, refillRate = 1) {
    if (!this._rateLimitBuckets) {
      this._rateLimitBuckets = new Map();
    }

    const now = Date.now();
    let bucket = this._rateLimitBuckets.get(key);

    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      this._rateLimitBuckets.set(key, bucket);
    }

    // Refill tokens
    const timePassed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + timePassed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate required dependencies
   * @param {string[]} required - Required dependency names
   * @throws {Error} If dependency is missing
   */
  validateDependencies(required) {
    for (const dep of required) {
      if (!this.dependencies[dep]) {
        throw new Error(`Missing required dependency: ${dep} in ${this.serviceName}`);
      }
    }
  }

  /**
   * Clean up resources
   * Override in subclasses if needed
   */
  async destroy() {
    this.removeAllListeners();
    this._rateLimitBuckets?.clear();
  }
}

module.exports = BaseService;
