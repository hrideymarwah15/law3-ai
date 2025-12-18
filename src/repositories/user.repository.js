/**
 * User Repository
 * Data access layer for users table
 * 
 * @module repositories/user.repository
 */

const BaseRepository = require('./base.repository');
const { NotFoundError } = require('../middleware/errorHandler');

class UserRepository extends BaseRepository {
  constructor() {
    super('users', {
      cacheTtl: 600, // 10 minutes
    });
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User or null
   */
  async findByEmail(email) {
    return this.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find user by phone
   * @param {string} phone - User phone
   * @returns {Promise<Object|null>} User or null
   */
  async findByPhone(phone) {
    return this.findOne({ phone });
  }

  /**
   * Find user by email or phone
   * @param {string} identifier - Email or phone
   * @returns {Promise<Object|null>} User or null
   */
  async findByEmailOrPhone(identifier) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select('*')
      .or(`email.eq.${identifier.toLowerCase()},phone.eq.${identifier}`)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  /**
   * Get user with profile
   * @param {string} id - User ID
   * @returns {Promise<Object>} User with profile
   */
  async findWithProfile(id) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        lawyers (
          id,
          bar_council_number,
          specialization,
          experience_years,
          is_verified,
          rating,
          total_reviews,
          consultation_fee
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('User not found');
      }
      throw error;
    }

    return data;
  }

  /**
   * Update last login timestamp
   * @param {string} id - User ID
   */
  async updateLastLogin(id) {
    await this.update(id, {
      last_login_at: new Date().toISOString(),
    });
  }

  /**
   * Get users by role
   * @param {string} role - User role
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array, total: number}>} Users
   */
  async findByRole(role, options = {}) {
    return this.findMany({
      where: { role },
      ...options,
    });
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array, total: number}>} Users
   */
  async search(query, options = {}) {
    const { page = 1, limit = 20, role } = options;
    const offset = (page - 1) * limit;

    let dbQuery = this.db
      .from(this.tableName)
      .select('*', { count: 'exact' })
      .or(`name.ilike.%${query}%,email.ilike.%${query}%`);

    if (role) {
      dbQuery = dbQuery.eq('role', role);
    }

    const { data, error, count } = await dbQuery
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: data || [], total: count || 0 };
  }

  /**
   * Ban user
   * @param {string} id - User ID
   * @param {string} reason - Ban reason
   * @returns {Promise<Object>} Updated user
   */
  async ban(id, reason) {
    return this.update(id, {
      is_banned: true,
      ban_reason: reason,
    });
  }

  /**
   * Unban user
   * @param {string} id - User ID
   * @returns {Promise<Object>} Updated user
   */
  async unban(id) {
    return this.update(id, {
      is_banned: false,
      ban_reason: null,
    });
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} Stats
   */
  async getStats() {
    const [total, verified, banned, lawyers] = await Promise.all([
      this.count(),
      this.count({ is_verified: true }),
      this.count({ is_banned: true }),
      this.count({ role: 'lawyer' }),
    ]);

    return {
      total,
      verified,
      banned,
      lawyers,
      users: total - lawyers,
    };
  }
}

module.exports = new UserRepository();
