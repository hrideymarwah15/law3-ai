/**
 * User Service
 * 
 * Handles user-related business logic including:
 * - User registration and profile management
 * - Authentication coordination
 * - User search and filtering
 * 
 * @extends BaseService
 */

const BaseService = require('./base.service');
const { ValidationError, NotFoundError, ConflictError } = require('../middleware/errorHandler');

class UserService extends BaseService {
  /**
   * @param {Object} options
   * @param {UserRepository} options.userRepository
   * @param {Object} [options.dependencies]
   */
  constructor({ userRepository, dependencies = {} }) {
    super({ repository: userRepository, dependencies });
    this.userRepository = userRepository;
  }

  /**
   * Get user by ID with optional profile
   * @param {string} userId 
   * @param {Object} options
   * @param {boolean} [options.includeProfile=true]
   * @returns {Promise<Object>}
   */
  async getUserById(userId, { includeProfile = true } = {}) {
    return this.withAudit('getUserById', { userId }, async () => {
      if (includeProfile) {
        return this.userRepository.findWithProfile(userId);
      }
      return this.userRepository.findByIdOrFail(userId);
    });
  }

  /**
   * Get user by email
   * @param {string} email 
   * @returns {Promise<Object|null>}
   */
  async getUserByEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    return this.userRepository.findByEmail(normalizedEmail);
  }

  /**
   * Get user by phone
   * @param {string} phone 
   * @returns {Promise<Object|null>}
   */
  async getUserByPhone(phone) {
    const normalizedPhone = phone.replace(/\D/g, '');
    return this.userRepository.findByPhone(normalizedPhone);
  }

  /**
   * Update user profile
   * @param {string} userId 
   * @param {Object} profileData 
   * @returns {Promise<Object>}
   */
  async updateProfile(userId, profileData) {
    return this.withAudit('updateProfile', { userId }, async () => {
      // Validate user exists
      await this.userRepository.findByIdOrFail(userId);

      // Sanitize profile data
      const sanitizedData = this._sanitizeProfileData(profileData);

      // Update profile
      const updated = await this.userRepository.update(userId, {
        ...sanitizedData,
        updated_at: new Date().toISOString(),
      });

      this.emit('user:profileUpdated', { userId, changes: Object.keys(sanitizedData) });
      
      return updated;
    });
  }

  /**
   * Update user's last login timestamp
   * @param {string} userId 
   * @returns {Promise<void>}
   */
  async recordLogin(userId) {
    await this.userRepository.updateLastLogin(userId);
    this.emit('user:login', { userId, timestamp: new Date().toISOString() });
  }

  /**
   * Search users
   * @param {Object} criteria
   * @param {string} [criteria.query]
   * @param {number} [criteria.page=1]
   * @param {number} [criteria.limit=20]
   * @returns {Promise<{data: Object[], pagination: Object}>}
   */
  async searchUsers({ query, page = 1, limit = 20 }) {
    return this.withAudit('searchUsers', { query, page }, async () => {
      if (query) {
        return this.userRepository.search(query, { page, limit });
      }
      return this.userRepository.findMany({ page, limit });
    });
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    return this.userRepository.getStats();
  }

  /**
   * Ban a user
   * @param {string} userId 
   * @param {string} reason 
   * @param {string} adminId 
   * @returns {Promise<Object>}
   */
  async banUser(userId, reason, adminId) {
    return this.withAudit('banUser', { userId, adminId, reason }, async () => {
      const user = await this.userRepository.findByIdOrFail(userId);
      
      if (user.is_banned) {
        throw new ConflictError('User is already banned');
      }

      const updated = await this.userRepository.ban(userId, reason);
      
      this.emit('user:banned', { 
        userId, 
        reason, 
        bannedBy: adminId,
        timestamp: new Date().toISOString(),
      });

      return updated;
    });
  }

  /**
   * Unban a user
   * @param {string} userId 
   * @param {string} adminId 
   * @returns {Promise<Object>}
   */
  async unbanUser(userId, adminId) {
    return this.withAudit('unbanUser', { userId, adminId }, async () => {
      const user = await this.userRepository.findByIdOrFail(userId);
      
      if (!user.is_banned) {
        throw new ConflictError('User is not banned');
      }

      const updated = await this.userRepository.unban(userId);
      
      this.emit('user:unbanned', { 
        userId, 
        unbannedBy: adminId,
        timestamp: new Date().toISOString(),
      });

      return updated;
    });
  }

  /**
   * Check if email is available
   * @param {string} email 
   * @param {string} [excludeUserId] - User ID to exclude (for updates)
   * @returns {Promise<boolean>}
   */
  async isEmailAvailable(email, excludeUserId = null) {
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    
    if (!existingUser) return true;
    if (excludeUserId && existingUser.id === excludeUserId) return true;
    
    return false;
  }

  /**
   * Check if phone is available
   * @param {string} phone 
   * @param {string} [excludeUserId]
   * @returns {Promise<boolean>}
   */
  async isPhoneAvailable(phone, excludeUserId = null) {
    const normalizedPhone = phone.replace(/\D/g, '');
    const existingUser = await this.userRepository.findByPhone(normalizedPhone);
    
    if (!existingUser) return true;
    if (excludeUserId && existingUser.id === excludeUserId) return true;
    
    return false;
  }

  /**
   * Delete user account (soft delete)
   * @param {string} userId 
   * @param {string} reason 
   * @returns {Promise<void>}
   */
  async deleteAccount(userId, reason = 'User requested') {
    return this.withAudit('deleteAccount', { userId, reason }, async () => {
      await this.userRepository.findByIdOrFail(userId);
      
      // Soft delete - update status
      await this.userRepository.update(userId, {
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        deletion_reason: reason,
      });

      this.emit('user:deleted', { userId, reason, timestamp: new Date().toISOString() });
    });
  }

  /**
   * Sanitize profile data
   * @private
   */
  _sanitizeProfileData(data) {
    const allowedFields = [
      'first_name',
      'last_name', 
      'phone',
      'avatar_url',
      'preferred_language',
      'notification_preferences',
      'address',
      'city',
      'state',
      'pincode',
    ];

    const sanitized = {};
    
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        // Trim strings
        if (typeof data[field] === 'string') {
          sanitized[field] = data[field].trim();
        } else {
          sanitized[field] = data[field];
        }
      }
    }

    // Normalize phone if present
    if (sanitized.phone) {
      sanitized.phone = sanitized.phone.replace(/\D/g, '');
    }

    return sanitized;
  }
}

module.exports = UserService;
