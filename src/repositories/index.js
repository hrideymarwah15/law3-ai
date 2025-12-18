/**
 * Repository Index
 * Export all repository classes from single point
 * 
 * @module repositories
 */

const BaseRepository = require('./base.repository');
const UserRepository = require('./user.repository');
const LawyerRepository = require('./lawyer.repository');
const ConsultationRepository = require('./consultation.repository');

module.exports = {
  BaseRepository,
  UserRepository,
  LawyerRepository,
  ConsultationRepository,
};
