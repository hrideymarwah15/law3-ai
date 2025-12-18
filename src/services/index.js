/**
 * Services Module Index
 * 
 * Exports all services and the DI container
 */

const BaseService = require('./base.service');
const UserService = require('./user.service');
const LawyerService = require('./lawyer.service');
const ConsultationService = require('./consultation.service');

const {
  container,
  getService,
  services,
  repositories,
  configureDefaultServices,
} = require('./container');

module.exports = {
  // Base class
  BaseService,

  // Service classes
  UserService,
  LawyerService,
  ConsultationService,

  // DI Container
  container,
  getService,
  services,
  repositories,
  configureDefaultServices,
};
