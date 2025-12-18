/**
 * Lawyer Service
 * 
 * Handles lawyer-related business logic including:
 * - Lawyer profile management
 * - Verification workflow
 * - Search and matching
 * - Availability management
 * 
 * @extends BaseService
 */

const BaseService = require('./base.service');
const { NotFoundError, ConflictError, ValidationError } = require('../middleware/errorHandler');

class LawyerService extends BaseService {
  /**
   * @param {Object} options
   * @param {LawyerRepository} options.lawyerRepository
   * @param {UserRepository} options.userRepository
   * @param {Object} [options.dependencies]
   */
  constructor({ lawyerRepository, userRepository, dependencies = {} }) {
    super({ repository: lawyerRepository, dependencies });
    this.lawyerRepository = lawyerRepository;
    this.userRepository = userRepository;
  }

  /**
   * Get lawyer by ID with full profile
   * @param {string} lawyerId 
   * @returns {Promise<Object>}
   */
  async getLawyerById(lawyerId) {
    return this.withAudit('getLawyerById', { lawyerId }, async () => {
      const lawyer = await this.lawyerRepository.findWithProfile(lawyerId);
      
      if (!lawyer) {
        throw new NotFoundError('Lawyer not found');
      }
      
      return lawyer;
    });
  }

  /**
   * Get lawyer by user ID
   * @param {string} userId 
   * @returns {Promise<Object>}
   */
  async getLawyerByUserId(userId) {
    return this.lawyerRepository.findByUserId(userId);
  }

  /**
   * Create lawyer profile
   * @param {string} userId 
   * @param {Object} profileData 
   * @returns {Promise<Object>}
   */
  async createLawyerProfile(userId, profileData) {
    return this.withAudit('createLawyerProfile', { userId }, async () => {
      // Check if user exists
      const user = await this.userRepository.findByIdOrFail(userId);
      
      // Check if lawyer profile already exists
      const existingLawyer = await this.lawyerRepository.findByUserId(userId);
      if (existingLawyer) {
        throw new ConflictError('Lawyer profile already exists for this user');
      }

      // Validate bar council number uniqueness
      if (profileData.bar_council_number) {
        const exists = await this.lawyerRepository.exists({
          bar_council_number: profileData.bar_council_number,
        });
        if (exists) {
          throw new ConflictError('Bar council number already registered');
        }
      }

      // Create lawyer profile
      const lawyer = await this.lawyerRepository.create({
        user_id: userId,
        ...this._sanitizeLawyerData(profileData),
        verification_status: 'pending',
        is_available: false,
        rating: 0,
        total_consultations: 0,
        created_at: new Date().toISOString(),
      });

      // Update user role
      await this.userRepository.update(userId, { role: 'lawyer' });

      this.emit('lawyer:created', { 
        lawyerId: lawyer.id, 
        userId,
        timestamp: new Date().toISOString(),
      });

      return lawyer;
    });
  }

  /**
   * Update lawyer profile
   * @param {string} lawyerId 
   * @param {Object} updateData 
   * @returns {Promise<Object>}
   */
  async updateLawyerProfile(lawyerId, updateData) {
    return this.withAudit('updateLawyerProfile', { lawyerId }, async () => {
      const lawyer = await this.lawyerRepository.findByIdOrFail(lawyerId);

      const sanitizedData = this._sanitizeLawyerData(updateData);

      const updated = await this.lawyerRepository.update(lawyerId, {
        ...sanitizedData,
        updated_at: new Date().toISOString(),
      });

      this.emit('lawyer:profileUpdated', { 
        lawyerId, 
        changes: Object.keys(sanitizedData),
      });

      return updated;
    });
  }

  /**
   * Search lawyers with filters
   * @param {Object} filters
   * @returns {Promise<{data: Object[], pagination: Object}>}
   */
  async searchLawyers(filters = {}) {
    return this.withAudit('searchLawyers', { filters }, async () => {
      const {
        query,
        specialization,
        city,
        minRating,
        maxFee,
        isAvailable,
        languages,
        sortBy = 'rating',
        page = 1,
        limit = 20,
      } = filters;

      // Only search verified lawyers
      const searchFilters = {
        verification_status: 'verified',
      };

      if (specialization) {
        searchFilters.specialization = specialization;
      }
      if (city) {
        searchFilters.city = city;
      }
      if (isAvailable !== undefined) {
        searchFilters.is_available = isAvailable;
      }

      return this.lawyerRepository.search({
        ...searchFilters,
        query,
        minRating,
        maxFee,
        languages,
        sortBy,
        page,
        limit,
      });
    });
  }

  /**
   * Verify a lawyer (admin action)
   * @param {string} lawyerId 
   * @param {string} adminId 
   * @param {Object} [verificationData]
   * @returns {Promise<Object>}
   */
  async verifyLawyer(lawyerId, adminId, verificationData = {}) {
    return this.withAudit('verifyLawyer', { lawyerId, adminId }, async () => {
      const lawyer = await this.lawyerRepository.findByIdOrFail(lawyerId);

      if (lawyer.verification_status === 'verified') {
        throw new ConflictError('Lawyer is already verified');
      }

      const updated = await this.lawyerRepository.verify(lawyerId, adminId, verificationData);

      this.emit('lawyer:verified', {
        lawyerId,
        verifiedBy: adminId,
        timestamp: new Date().toISOString(),
      });

      // TODO: Send notification to lawyer about verification
      
      return updated;
    });
  }

  /**
   * Reject lawyer verification (admin action)
   * @param {string} lawyerId 
   * @param {string} adminId 
   * @param {string} reason 
   * @returns {Promise<Object>}
   */
  async rejectLawyer(lawyerId, adminId, reason) {
    return this.withAudit('rejectLawyer', { lawyerId, adminId, reason }, async () => {
      const lawyer = await this.lawyerRepository.findByIdOrFail(lawyerId);

      if (lawyer.verification_status === 'rejected') {
        throw new ConflictError('Lawyer verification is already rejected');
      }

      if (!reason || reason.trim().length < 10) {
        throw new ValidationError('Rejection reason must be at least 10 characters');
      }

      const updated = await this.lawyerRepository.reject(lawyerId, adminId, reason);

      this.emit('lawyer:rejected', {
        lawyerId,
        rejectedBy: adminId,
        reason,
        timestamp: new Date().toISOString(),
      });

      // TODO: Send notification to lawyer about rejection
      
      return updated;
    });
  }

  /**
   * Update lawyer availability
   * @param {string} lawyerId 
   * @param {boolean} isAvailable 
   * @param {Object} [availability] - Available time slots
   * @returns {Promise<Object>}
   */
  async updateAvailability(lawyerId, isAvailable, availability = null) {
    return this.withAudit('updateAvailability', { lawyerId, isAvailable }, async () => {
      const lawyer = await this.lawyerRepository.findByIdOrFail(lawyerId);

      // Only verified lawyers can set availability
      if (lawyer.verification_status !== 'verified') {
        throw new ValidationError('Only verified lawyers can update availability');
      }

      const updated = await this.lawyerRepository.updateAvailability(
        lawyerId, 
        isAvailable, 
        availability
      );

      this.emit('lawyer:availabilityChanged', {
        lawyerId,
        isAvailable,
        timestamp: new Date().toISOString(),
      });

      return updated;
    });
  }

  /**
   * Get pending verification requests
   * @param {Object} options
   * @returns {Promise<{data: Object[], pagination: Object}>}
   */
  async getPendingVerifications({ page = 1, limit = 20 } = {}) {
    return this.lawyerRepository.findPendingVerification({ page, limit });
  }

  /**
   * Get top rated lawyers
   * @param {number} limit 
   * @returns {Promise<Object[]>}
   */
  async getTopRatedLawyers(limit = 10) {
    return this.lawyerRepository.getTopRated(limit);
  }

  /**
   * Recalculate lawyer rating after new review
   * @param {string} lawyerId 
   * @returns {Promise<void>}
   */
  async recalculateRating(lawyerId) {
    return this.withAudit('recalculateRating', { lawyerId }, async () => {
      await this.lawyerRepository.recalculateRating(lawyerId);
      
      this.emit('lawyer:ratingUpdated', {
        lawyerId,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Get lawyer statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    return this.lawyerRepository.getStats();
  }

  /**
   * Get lawyer's availability for a specific date
   * @param {string} lawyerId 
   * @param {Date} date 
   * @returns {Promise<Object[]>} Available time slots
   */
  async getAvailabilityForDate(lawyerId, date) {
    const lawyer = await this.lawyerRepository.findByIdOrFail(lawyerId);
    
    if (!lawyer.is_available) {
      return [];
    }

    if (!lawyer.availability) {
      return [];
    }

    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'lowercase' });
    return lawyer.availability[dayOfWeek] || [];
  }

  /**
   * Sanitize lawyer data
   * @private
   */
  _sanitizeLawyerData(data) {
    const allowedFields = [
      'bar_council_number',
      'specialization',
      'experience_years',
      'consultation_fee',
      'bio',
      'education',
      'court_practice_areas',
      'languages',
      'office_address',
      'city',
      'state',
      'pincode',
      'availability',
    ];

    const sanitized = {};

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (typeof data[field] === 'string') {
          sanitized[field] = data[field].trim();
        } else {
          sanitized[field] = data[field];
        }
      }
    }

    // Ensure numeric fields are numbers
    if (sanitized.experience_years) {
      sanitized.experience_years = parseInt(sanitized.experience_years, 10);
    }
    if (sanitized.consultation_fee) {
      sanitized.consultation_fee = parseFloat(sanitized.consultation_fee);
    }

    return sanitized;
  }
}

module.exports = LawyerService;
