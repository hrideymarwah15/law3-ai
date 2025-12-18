/**
 * Dependency Injection Container
 * 
 * Centralized service factory that manages:
 * - Singleton instances
 * - Dependency wiring
 * - Service lifecycle
 * 
 * This provides a clean way to manage dependencies across the application
 * without tightly coupling components.
 */

const logger = require('../config/logger');

// Repositories
const {
  UserRepository,
  LawyerRepository,
  ConsultationRepository,
} = require('../repositories');

// Services
const UserService = require('./user.service');
const LawyerService = require('./lawyer.service');
const ConsultationService = require('./consultation.service');

/**
 * Container class for dependency injection
 */
class Container {
  constructor() {
    this._instances = new Map();
    this._factories = new Map();
    this._initialized = false;
  }

  /**
   * Register a factory function for a service
   * @param {string} name - Service name
   * @param {Function} factory - Factory function
   * @param {boolean} [singleton=true] - Whether to cache instance
   */
  register(name, factory, singleton = true) {
    this._factories.set(name, { factory, singleton });
    logger.debug({ message: 'Registered service', service: name, singleton });
  }

  /**
   * Resolve a service by name
   * @param {string} name - Service name
   * @returns {any} Service instance
   */
  resolve(name) {
    // Check cached instances first
    if (this._instances.has(name)) {
      return this._instances.get(name);
    }

    const registration = this._factories.get(name);
    if (!registration) {
      throw new Error(`Service '${name}' is not registered`);
    }

    const instance = registration.factory(this);

    if (registration.singleton) {
      this._instances.set(name, instance);
    }

    return instance;
  }

  /**
   * Check if a service is registered
   * @param {string} name 
   * @returns {boolean}
   */
  has(name) {
    return this._factories.has(name);
  }

  /**
   * Get all registered service names
   * @returns {string[]}
   */
  getRegisteredServices() {
    return Array.from(this._factories.keys());
  }

  /**
   * Initialize all services
   * This ensures all singletons are created upfront
   */
  initialize() {
    if (this._initialized) {
      logger.warn('Container already initialized');
      return;
    }

    logger.info('Initializing dependency container...');

    for (const [name, registration] of this._factories.entries()) {
      if (registration.singleton) {
        try {
          this.resolve(name);
          logger.debug({ message: 'Initialized service', service: name });
        } catch (error) {
          logger.error({ 
            message: 'Failed to initialize service', 
            service: name, 
            error: error.message,
          });
          throw error;
        }
      }
    }

    this._initialized = true;
    logger.info(`Container initialized with ${this._instances.size} services`);
  }

  /**
   * Destroy all service instances
   * Call this during graceful shutdown
   */
  async destroy() {
    logger.info('Destroying container services...');

    for (const [name, instance] of this._instances.entries()) {
      try {
        if (typeof instance.destroy === 'function') {
          await instance.destroy();
          logger.debug({ message: 'Destroyed service', service: name });
        }
      } catch (error) {
        logger.error({ 
          message: 'Error destroying service', 
          service: name, 
          error: error.message,
        });
      }
    }

    this._instances.clear();
    this._initialized = false;
  }

  /**
   * Reset container (for testing)
   */
  reset() {
    this._instances.clear();
    this._factories.clear();
    this._initialized = false;
  }
}

// Create global container instance
const container = new Container();

/**
 * Configure default services
 */
function configureDefaultServices() {
  // Register repositories (singletons)
  container.register('userRepository', () => new UserRepository());
  container.register('lawyerRepository', () => new LawyerRepository());
  container.register('consultationRepository', () => new ConsultationRepository());

  // Register services (singletons with dependencies)
  container.register('userService', (c) => new UserService({
    userRepository: c.resolve('userRepository'),
    dependencies: {},
  }));

  container.register('lawyerService', (c) => new LawyerService({
    lawyerRepository: c.resolve('lawyerRepository'),
    userRepository: c.resolve('userRepository'),
    dependencies: {},
  }));

  container.register('consultationService', (c) => new ConsultationService({
    consultationRepository: c.resolve('consultationRepository'),
    lawyerRepository: c.resolve('lawyerRepository'),
    userRepository: c.resolve('userRepository'),
    dependencies: {},
  }));

  logger.info('Default services configured');
}

// Configure on import
configureDefaultServices();

/**
 * Helper function to get services
 */
const getService = (name) => container.resolve(name);

/**
 * Named service accessors
 */
const services = {
  get userService() {
    return container.resolve('userService');
  },
  get lawyerService() {
    return container.resolve('lawyerService');
  },
  get consultationService() {
    return container.resolve('consultationService');
  },
};

/**
 * Named repository accessors
 */
const repositories = {
  get userRepository() {
    return container.resolve('userRepository');
  },
  get lawyerRepository() {
    return container.resolve('lawyerRepository');
  },
  get consultationRepository() {
    return container.resolve('consultationRepository');
  },
};

module.exports = {
  container,
  getService,
  services,
  repositories,
  configureDefaultServices,
};
