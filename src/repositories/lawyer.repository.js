/**
 * Lawyer Repository
 * Data access layer for lawyers table
 * 
 * @module repositories/lawyer.repository
 */

const BaseRepository = require('./base.repository');
const { NotFoundError } = require('../middleware/errorHandler');

class LawyerRepository extends BaseRepository {
  constructor() {
    super('lawyers', {
      cacheTtl: 300, // 5 minutes
    });
  }

  /**
   * Find lawyer by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Lawyer or null
   */
  async findByUserId(userId) {
    return this.findOne({ user_id: userId });
  }

  /**
   * Get lawyer with full profile
   * @param {string} id - Lawyer ID
   * @returns {Promise<Object>} Lawyer with user info
   */
  async findWithProfile(id) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        users!inner (
          id,
          name,
          email,
          phone,
          avatar_url,
          city,
          state
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Lawyer not found');
      }
      throw error;
    }

    return data;
  }

  /**
   * Search verified lawyers
   * @param {Object} filters - Search filters
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array, total: number}>} Lawyers
   */
  async search(filters = {}, options = {}) {
    const {
      specialization,
      city,
      minRating,
      maxFee,
      minExperience,
      isAvailable,
      query,
    } = filters;

    const { page = 1, limit = 20, sortBy = 'rating', sortOrder = 'desc' } = options;
    const offset = (page - 1) * limit;

    let dbQuery = this.db
      .from(this.tableName)
      .select(`
        *,
        users!inner (
          name,
          avatar_url,
          city,
          state
        )
      `, { count: 'exact' })
      .eq('is_verified', true);

    // Apply filters
    if (specialization) {
      dbQuery = dbQuery.eq('specialization', specialization);
    }

    if (city) {
      dbQuery = dbQuery.ilike('office_city', `%${city}%`);
    }

    if (minRating) {
      dbQuery = dbQuery.gte('rating', minRating);
    }

    if (maxFee) {
      dbQuery = dbQuery.lte('consultation_fee', maxFee);
    }

    if (minExperience) {
      dbQuery = dbQuery.gte('experience_years', minExperience);
    }

    if (isAvailable !== undefined) {
      dbQuery = dbQuery.eq('is_available', isAvailable);
    }

    if (query) {
      dbQuery = dbQuery.or(`bio.ilike.%${query}%,specialization.ilike.%${query}%`);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    dbQuery = dbQuery.order(sortBy, { ascending });

    // Apply pagination
    dbQuery = dbQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await dbQuery;

    if (error) throw error;

    return { data: data || [], total: count || 0 };
  }

  /**
   * Get lawyers pending verification
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array, total: number}>} Pending lawyers
   */
  async findPendingVerification(options = {}) {
    return this.findMany({
      where: { verification_status: 'pending' },
      orderBy: { column: 'created_at', ascending: true },
      ...options,
    });
  }

  /**
   * Verify lawyer
   * @param {string} id - Lawyer ID
   * @returns {Promise<Object>} Updated lawyer
   */
  async verify(id) {
    return this.update(id, {
      is_verified: true,
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
      rejection_reason: null,
    });
  }

  /**
   * Reject lawyer verification
   * @param {string} id - Lawyer ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated lawyer
   */
  async reject(id, reason) {
    return this.update(id, {
      is_verified: false,
      verification_status: 'rejected',
      rejection_reason: reason,
    });
  }

  /**
   * Update lawyer availability
   * @param {string} id - Lawyer ID
   * @param {boolean} isAvailable - Availability status
   * @returns {Promise<Object>} Updated lawyer
   */
  async updateAvailability(id, isAvailable) {
    return this.update(id, { is_available: isAvailable });
  }

  /**
   * Update lawyer rating (called after review)
   * @param {string} id - Lawyer ID
   * @returns {Promise<Object>} Updated lawyer
   */
  async recalculateRating(id) {
    const { data, error } = await this.db
      .from('reviews')
      .select('rating')
      .eq('lawyer_id', id);

    if (error) throw error;

    if (data && data.length > 0) {
      const avgRating = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
      return this.update(id, {
        rating: Math.round(avgRating * 10) / 10,
        total_reviews: data.length,
      });
    }

    return this.findById(id);
  }

  /**
   * Increment consultation count
   * @param {string} id - Lawyer ID
   */
  async incrementConsultationCount(id) {
    await this.db.rpc('increment', {
      table_name: 'lawyers',
      column_name: 'total_consultations',
      row_id: id,
    });
  }

  /**
   * Get lawyer statistics
   * @returns {Promise<Object>} Stats
   */
  async getStats() {
    const [total, verified, pending, rejected] = await Promise.all([
      this.count(),
      this.count({ is_verified: true }),
      this.count({ verification_status: 'pending' }),
      this.count({ verification_status: 'rejected' }),
    ]);

    // Get average rating
    const { data: ratingData } = await this.db
      .from(this.tableName)
      .select('rating')
      .eq('is_verified', true)
      .gt('rating', 0);

    const avgRating = ratingData && ratingData.length > 0
      ? ratingData.reduce((sum, r) => sum + parseFloat(r.rating), 0) / ratingData.length
      : 0;

    return {
      total,
      verified,
      pending,
      rejected,
      averageRating: Math.round(avgRating * 10) / 10,
    };
  }

  /**
   * Get top rated lawyers
   * @param {number} limit - Number of lawyers
   * @returns {Promise<Array>} Top lawyers
   */
  async getTopRated(limit = 10) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        id,
        specialization,
        rating,
        total_reviews,
        consultation_fee,
        users!inner (
          name,
          avatar_url,
          city
        )
      `)
      .eq('is_verified', true)
      .eq('is_available', true)
      .gt('rating', 0)
      .order('rating', { ascending: false })
      .order('total_reviews', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  }
}

module.exports = new LawyerRepository();
