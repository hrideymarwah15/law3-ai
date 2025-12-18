/**
 * Graceful Shutdown Handler
 * 
 * Manages application shutdown by:
 * - Stopping accepting new connections
 * - Completing in-flight requests
 * - Closing database/cache connections
 * - Cleanup resources
 * 
 * This ensures zero-downtime deployments and data integrity.
 */

const logger = require('../config/logger');

class GracefulShutdown {
  constructor() {
    this.isShuttingDown = false;
    this.server = null;
    this.cleanupHandlers = [];
    this.shutdownTimeout = 30000; // 30 seconds default
  }

  /**
   * Initialize shutdown handler with the HTTP server
   * @param {http.Server} server - HTTP server instance
   * @param {Object} [options] - Configuration options
   */
  init(server, options = {}) {
    this.server = server;
    this.shutdownTimeout = options.timeout || 30000;

    // Register signal handlers
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.fatal({ 
        message: 'Uncaught exception', 
        error: error.message, 
        stack: error.stack,
      });
      this.shutdown('UNCAUGHT_EXCEPTION', 1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal({ 
        message: 'Unhandled promise rejection', 
        reason: reason?.message || reason,
        stack: reason?.stack,
      });
      this.shutdown('UNHANDLED_REJECTION', 1);
    });

    logger.info('Graceful shutdown handler initialized');
  }

  /**
   * Register a cleanup handler
   * @param {string} name - Handler name for logging
   * @param {Function} handler - Async cleanup function
   * @param {number} [priority=10] - Higher priority runs first
   */
  registerCleanup(name, handler, priority = 10) {
    this.cleanupHandlers.push({ name, handler, priority });
    // Sort by priority (higher first)
    this.cleanupHandlers.sort((a, b) => b.priority - a.priority);
    logger.debug({ message: 'Registered cleanup handler', name, priority });
  }

  /**
   * Initiate graceful shutdown
   * @param {string} signal - Shutdown signal
   * @param {number} [exitCode=0] - Process exit code
   */
  async shutdown(signal, exitCode = 0) {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring duplicate signal');
      return;
    }

    this.isShuttingDown = true;
    logger.info({ message: 'Graceful shutdown initiated', signal });

    // Set a hard timeout for shutdown
    const forceShutdownTimer = setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(exitCode || 1);
    }, this.shutdownTimeout);

    try {
      // Stop accepting new connections
      if (this.server) {
        await this.closeServer();
      }

      // Run cleanup handlers in order
      await this.runCleanupHandlers();

      logger.info('Graceful shutdown completed');
    } catch (error) {
      logger.error({ 
        message: 'Error during shutdown', 
        error: error.message,
        stack: error.stack,
      });
    } finally {
      clearTimeout(forceShutdownTimer);
      process.exit(exitCode);
    }
  }

  /**
   * Close HTTP server gracefully
   * @private
   */
  closeServer() {
    return new Promise((resolve, reject) => {
      logger.info('Stopping HTTP server...');

      // Stop accepting new connections
      this.server.close((err) => {
        if (err) {
          logger.error({ message: 'Error closing server', error: err.message });
          reject(err);
        } else {
          logger.info('HTTP server closed');
          resolve();
        }
      });

      // Close existing keep-alive connections after a grace period
      setTimeout(() => {
        logger.info('Destroying remaining connections');
        this.server.closeAllConnections?.();
      }, 5000);
    });
  }

  /**
   * Run all registered cleanup handlers
   * @private
   */
  async runCleanupHandlers() {
    for (const { name, handler } of this.cleanupHandlers) {
      try {
        logger.debug({ message: 'Running cleanup handler', name });
        await Promise.race([
          handler(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Cleanup timeout')), 5000)
          ),
        ]);
        logger.debug({ message: 'Cleanup handler completed', name });
      } catch (error) {
        logger.error({ 
          message: 'Cleanup handler failed', 
          name, 
          error: error.message,
        });
      }
    }
  }

  /**
   * Middleware to reject new requests during shutdown
   * @returns {Function} Express middleware
   */
  middleware() {
    return (req, res, next) => {
      if (this.isShuttingDown) {
        res.set('Connection', 'close');
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Server is shutting down, please retry',
          },
        });
      }
      next();
    };
  }

  /**
   * Check if shutdown is in progress
   * @returns {boolean}
   */
  get shuttingDown() {
    return this.isShuttingDown;
  }
}

// Singleton instance
const gracefulShutdown = new GracefulShutdown();

// Common cleanup handlers
const registerDefaultCleanups = () => {
  // Redis cleanup
  gracefulShutdown.registerCleanup('redis', async () => {
    try {
      const { redisClient } = require('../config/redis');
      if (redisClient?.isOpen) {
        await redisClient.quit();
        logger.info('Redis connection closed');
      }
    } catch (error) {
      logger.debug('Redis not connected or already closed');
    }
  }, 5);

  // DI Container cleanup
  gracefulShutdown.registerCleanup('container', async () => {
    try {
      const { container } = require('../services');
      await container.destroy();
      logger.info('Service container destroyed');
    } catch (error) {
      logger.debug('Container cleanup failed');
    }
  }, 10);

  // Logger flush
  gracefulShutdown.registerCleanup('logger', async () => {
    // Flush any pending logs
    await new Promise(resolve => setTimeout(resolve, 100));
    logger.info('Logs flushed');
  }, 1);
};

module.exports = {
  gracefulShutdown,
  registerDefaultCleanups,
};
