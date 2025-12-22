/**
 * Consultation Repository
 * Data access layer for consultations table
 * 
 * @module repositories/consultation.repository
 */

const BaseRepository = require('./base.repository');
const { NotFoundError, ForbiddenError } = require('../middleware/errorHandler');

class ConsultationRepository extends BaseRepository {
  constructor() {
    super('consultations', {
      cacheTtl: 60, // 1 minute (consultations change frequently)
    });
  }

  /**
   * Get consultation with related data
   * @param {string} id - Consultation ID
   * @returns {Promise<Object>} Consultation with relations
   */
  async findWithRelations(id) {
    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name,
          display_name,
          email,
          phone,
          avatar_url
        ),
        lawyers:lawyer_id (
          id,
          specialization,
          consultation_fee,
          users:user_id (
            first_name,
            last_name,
            display_name,
            email,
            phone,
            avatar_url
          )
        ),
        payments (
          id,
          amount,
          status,
          razorpay_payment_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Consultation not found');
      }
      throw error;
    }

    return data;
  }

  /**
   * Get user's consultations
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array, total: number}>} Consultations
   */
  async findByUser(userId, options = {}) {
    const { status, page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    let query = this.db
      .from(this.tableName)
      .select(`
        *,
        lawyers:lawyer_id (
          id,
          specialization,
          users:user_id (
            display_name,
            avatar_url
          )
        )
      `, { count: 'exact' })
      .eq('user_id', userId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('booking_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return { data: data || [], total: count || 0 };
  }

  /**
   * Get lawyer's consultations
   * @param {string} lawyerId - Lawyer ID
   * @param {Object} options - Query options
   * @returns {Promise<{data: Array, total: number}>} Consultations
   */
  async findByLawyer(lawyerId, options = {}) {
    const { status, page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    let query = this.db
      .from(this.tableName)
      .select(`
        *,
        users:user_id (
          id,
          first_name,
          last_name,
          display_name,
          email,
          phone,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('lawyer_id', lawyerId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('booking_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return { data: data || [], total: count || 0 };
  }

  /**
   * Check if slot is available
   * @param {string} lawyerId - Lawyer ID
   * @param {string} date - Booking date
   * @param {string} time - Booking time
   * @param {string} [excludeConsultationId] - Consultation ID to exclude (for rescheduling)
   * @returns {Promise<boolean>} Is available
   */
  async isSlotAvailable(lawyerId, date, time, excludeConsultationId = null) {
    let query = this.db
      .from(this.tableName)
      .select('id')
      .eq('lawyer_id', lawyerId)
      .eq('booking_date', date)
      .eq('booking_time', time)
      .in('status', ['pending', 'confirmed']);
    
    // Exclude current consultation when rescheduling
    if (excludeConsultationId) {
      query = query.neq('id', excludeConsultationId);
    }

    const { data } = await query.limit(1).single();

    return !data;
  }

  /**
   * Get upcoming consultations for a user
   * @param {string} userId - User ID
   * @param {number} days - Number of days ahead
   * @returns {Promise<Array>} Upcoming consultations
   */
  async getUpcoming(userId, days = 7) {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data, error } = await this.db
      .from(this.tableName)
      .select(`
        *,
        lawyers:lawyer_id (
          id,
          users:user_id (
            display_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .gte('booking_date', today)
      .lte('booking_date', futureDate)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (error) throw error;

    return data || [];
  }

  /**
   * Update consultation status
   * @param {string} id - Consultation ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional update data
   * @returns {Promise<Object>} Updated consultation
   */
  async updateStatus(id, status, additionalData = {}) {
    const updateData = {
      status,
      ...additionalData,
    };

    // Add status-specific timestamps
    if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    return this.update(id, updateData);
  }

  /**
   * Get consultation statistics
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Stats
   */
  async getStats(filters = {}) {
    const { lawyerId, userId, startDate, endDate } = filters;

    let baseQuery = this.db.from(this.tableName).select('status, amount', { count: 'exact' });

    if (lawyerId) baseQuery = baseQuery.eq('lawyer_id', lawyerId);
    if (userId) baseQuery = baseQuery.eq('user_id', userId);
    if (startDate) baseQuery = baseQuery.gte('booking_date', startDate);
    if (endDate) baseQuery = baseQuery.lte('booking_date', endDate);

    const { data, error } = await baseQuery;

    if (error) throw error;

    const stats = {
      total: data.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      totalRevenue: 0,
    };

    for (const consultation of data) {
      stats[consultation.status] = (stats[consultation.status] || 0) + 1;
      if (consultation.status === 'completed') {
        stats.totalRevenue += consultation.amount || 0;
      }
    }

    return stats;
  }

  /**
   * Get revenue by period
   * @param {string} period - 'day', 'week', 'month'
   * @param {number} count - Number of periods
   * @returns {Promise<Array>} Revenue data
   */
  async getRevenueByPeriod(period = 'day', count = 30) {
    const { data, error } = await this.db.rpc('get_revenue_by_period', {
      period_type: period,
      period_count: count,
    }).catch(() => ({ data: null, error: null }));

    // Fallback if RPC doesn't exist
    if (!data) {
      const { data: consultations } = await this.db
        .from(this.tableName)
        .select('booking_date, amount')
        .eq('status', 'completed')
        .gte('booking_date', new Date(Date.now() - count * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('booking_date', { ascending: true });

      // Group by date
      const grouped = {};
      for (const c of consultations || []) {
        const date = c.booking_date;
        grouped[date] = (grouped[date] || 0) + c.amount;
      }

      return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue }));
    }

    return data;
  }
}

module.exports = ConsultationRepository;
