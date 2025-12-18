/**
 * Repository Index
 * Export all repositories from single point
 * 
 * @module repositories
 */

const BaseRepository = require('./base.repository');
const userRepository = require('./user.repository');
const lawyerRepository = require('./lawyer.repository');
const consultationRepository = require('./consultation.repository');

module.exports = {
  BaseRepository,
  userRepository,
  lawyerRepository,
  consultationRepository,
};
