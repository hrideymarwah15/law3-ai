const { supabaseAdmin } = require('../config/supabase');
const { NotFoundError, ValidationError, ForbiddenError } = require('../middleware/errorHandler');
const { cache, redisClient } = require('../config/redis');
const logger = require('../config/logger');
const { auditService, AuditActions } = require('../services/audit.service');

class AdminController {
  /**
   * GET /admin/dashboard
   * Get admin dashboard stats
   */
  async getDashboard(req, res, next) {
    try {
      const cacheKey = 'admin:dashboard';
      const cached = await cache.get(cacheKey);

      if (cached) {
        return res.json({ success: true, ...cached, cached: true });
      }

      // Run parallel queries for stats
      const [
        userCountResult,
        lawyerCountResult,
        consultationCountResult,
        revenueResult,
        pendingVerificationResult,
        recentConsultationsResult,
      ] = await Promise.all([
        // Total users
        supabaseAdmin
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'user'),

        // Total lawyers
        supabaseAdmin
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'lawyer'),

        // Total consultations
        supabaseAdmin
          .from('consultations')
          .select('*', { count: 'exact', head: true }),

        // Total revenue (completed consultations)
        supabaseAdmin
          .from('consultations')
          .select('amount')
          .eq('status', 'completed'),

        // Lawyers pending verification
        supabaseAdmin
          .from('lawyers')
          .select('*', { count: 'exact', head: true })
          .eq('verification_status', 'pending'),

        // Recent consultations
        supabaseAdmin
          .from('consultations')
          .select(
            `
            id,
            status,
            amount,
            booking_date,
            booking_time,
            user:users!consultations_user_id_fkey(id, name, email),
            lawyer:lawyers!consultations_lawyer_id_fkey(id, user_id)
          `
          )
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      // Calculate total revenue
      const totalRevenue = revenueResult.data?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      // Get consultation stats by status
      const { data: consultationStats } = await supabaseAdmin
        .from('consultations')
        .select('status');

      const statusCounts = consultationStats?.reduce(
        (acc, c) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        },
        {}
      );

      const stats = {
        users: {
          total: userCountResult.count || 0,
        },
        lawyers: {
          total: lawyerCountResult.count || 0,
          pendingVerification: pendingVerificationResult.count || 0,
        },
        consultations: {
          total: consultationCountResult.count || 0,
          byStatus: statusCounts || {},
        },
        revenue: {
          total: totalRevenue,
          currency: 'INR',
        },
        recentConsultations: recentConsultationsResult.data || [],
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, stats, 300);

      res.json({
        success: true,
        ...stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/lawyers/pending
   * Get lawyers pending verification
   */
  async getPendingLawyers(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabaseAdmin
        .from('lawyers')
        .select(
          `
          *,
          user:users!lawyers_user_id_fkey(id, name, email, phone, created_at)
        `,
          { count: 'exact' }
        )
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        total: count,
        page,
        limit,
        lawyers: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /admin/lawyers/:lawyer_id/verify
   * Verify or reject a lawyer
   */
  async verifyLawyer(req, res, next) {
    try {
      const { lawyer_id } = req.params;
      const { status, rejection_reason } = req.body;

      if (!['verified', 'rejected'].includes(status)) {
        throw new ValidationError('Status must be "verified" or "rejected"');
      }

      if (status === 'rejected' && !rejection_reason) {
        throw new ValidationError('Rejection reason is required');
      }

      // Get current lawyer data for audit
      const { data: oldData } = await supabaseAdmin
        .from('lawyers')
        .select('*')
        .eq('user_id', lawyer_id)
        .single();

      const updateData = {
        verification_status: status,
        verified_at: status === 'verified' ? new Date().toISOString() : null,
        rejection_reason: status === 'rejected' ? rejection_reason : null,
        updated_at: new Date().toISOString(),
      };

      const { data: updated, error } = await supabaseAdmin
        .from('lawyers')
        .update(updateData)
        .eq('user_id', lawyer_id)
        .select()
        .single();

      if (error || !updated) {
        throw new NotFoundError('Lawyer profile not found');
      }

      // Log audit event
      await auditService.log({
        action: status === 'verified' ? AuditActions.LAWYER_VERIFIED : AuditActions.LAWYER_REJECTED,
        userId: req.user.id,
        entityType: 'lawyer',
        entityId: lawyer_id,
        oldData: { verification_status: oldData?.verification_status },
        newData: { verification_status: status, rejection_reason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Clear cache
      await cache.del(`lawyer:profile:${lawyer_id}`);
      await cache.del('admin:dashboard');

      logger.info({
        message: `Lawyer ${status}`,
        lawyerId: lawyer_id,
        adminId: req.user.id,
      });

      res.json({
        success: true,
        message: `Lawyer ${status} successfully`,
        profile: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/users
   * List all users with pagination
   */
  async listUsers(req, res, next) {
    try {
      const { role, search, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('users')
        .select('id, name, email, phone, role, created_at, updated_at', { count: 'exact' });

      if (role) {
        query = query.eq('role', role);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        total: count,
        page,
        limit,
        users: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/users/:user_id
   * Get user details
   */
  async getUserDetails(req, res, next) {
    try {
      const { user_id } = req.params;

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', user_id)
        .single();

      if (error || !user) {
        throw new NotFoundError('User not found');
      }

      // Get additional data based on role
      let additionalData = {};

      if (user.role === 'lawyer') {
        const { data: profile } = await supabaseAdmin
          .from('lawyers')
          .select('*')
          .eq('user_id', user_id)
          .single();

        additionalData.lawyerProfile = profile;
      }

      // Get consultation stats
      const { data: consultations } = await supabaseAdmin
        .from('consultations')
        .select('status, amount')
        .or(`user_id.eq.${user_id},lawyer_id.eq.${user_id}`);

      const consultationStats = {
        total: consultations?.length || 0,
        completed: consultations?.filter((c) => c.status === 'completed').length || 0,
        totalSpent:
          user.role === 'user'
            ? consultations
                ?.filter((c) => c.status === 'completed')
                .reduce((sum, c) => sum + (c.amount || 0), 0) || 0
            : 0,
        totalEarned:
          user.role === 'lawyer'
            ? consultations
                ?.filter((c) => c.status === 'completed')
                .reduce((sum, c) => sum + (c.amount || 0), 0) || 0
            : 0,
      };

      res.json({
        success: true,
        user: {
          ...user,
          ...additionalData,
          consultationStats,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /admin/users/:user_id/ban
   * Ban or unban a user
   */
  async toggleUserBan(req, res, next) {
    try {
      const { user_id } = req.params;
      const { banned, reason } = req.body;

      // Get current user data for audit
      const { data: oldData } = await supabaseAdmin
        .from('users')
        .select('is_banned, ban_reason')
        .eq('id', user_id)
        .single();

      // Update user status
      const { data: updated, error } = await supabaseAdmin
        .from('users')
        .update({
          is_banned: banned,
          ban_reason: banned ? reason : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user_id)
        .select()
        .single();

      if (error || !updated) {
        throw new NotFoundError('User not found');
      }

      // Log audit event
      await auditService.log({
        action: banned ? AuditActions.ADMIN_USER_BAN : AuditActions.ADMIN_USER_UNBAN,
        userId: req.user.id,
        entityType: 'user',
        entityId: user_id,
        oldData: { is_banned: oldData?.is_banned, ban_reason: oldData?.ban_reason },
        newData: { is_banned: banned, ban_reason: reason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      logger.info({
        message: `User ${banned ? 'banned' : 'unbanned'}`,
        userId: user_id,
        adminId: req.user.id,
        reason,
      });

      res.json({
        success: true,
        message: `User ${banned ? 'banned' : 'unbanned'} successfully`,
        user: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/consultations
   * List all consultations
   */
  async listConsultations(req, res, next) {
    try {
      const { status, from_date, to_date, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('consultations')
        .select(
          `
          *,
          user:users!consultations_user_id_fkey(id, name, email),
          lawyer:lawyers!consultations_lawyer_id_fkey(id, user_id)
        `,
          { count: 'exact' }
        );

      if (status) {
        query = query.eq('status', status);
      }
      if (from_date) {
        query = query.gte('booking_date', from_date);
      }
      if (to_date) {
        query = query.lte('booking_date', to_date);
      }

      const { data, error, count } = await query
        .order('booking_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        total: count,
        page,
        limit,
        consultations: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/revenue
   * Get revenue analytics
   */
  async getRevenueAnalytics(req, res, next) {
    try {
      const { period = 'month', from_date, to_date } = req.query;

      let startDate, endDate;

      if (from_date && to_date) {
        startDate = new Date(from_date);
        endDate = new Date(to_date);
      } else {
        endDate = new Date();
        startDate = new Date();

        switch (period) {
          case 'week':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(endDate.getMonth() - 1);
            break;
          case 'quarter':
            startDate.setMonth(endDate.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        }
      }

      const { data: consultations, error } = await supabaseAdmin
        .from('consultations')
        .select('amount, booking_date, status')
        .eq('status', 'completed')
        .gte('booking_date', startDate.toISOString().split('T')[0])
        .lte('booking_date', endDate.toISOString().split('T')[0]);

      if (error) {
        throw error;
      }

      // Group by date
      const dailyRevenue = {};
      for (const c of consultations || []) {
        const date = c.booking_date;
        dailyRevenue[date] = (dailyRevenue[date] || 0) + (c.amount || 0);
      }

      const totalRevenue = Object.values(dailyRevenue).reduce((sum, v) => sum + v, 0);
      const averagePerDay = Object.keys(dailyRevenue).length
        ? totalRevenue / Object.keys(dailyRevenue).length
        : 0;

      res.json({
        success: true,
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        analytics: {
          totalRevenue,
          totalConsultations: consultations?.length || 0,
          averagePerDay: Math.round(averagePerDay),
          dailyBreakdown: dailyRevenue,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/audit-logs
   * Get audit logs with filtering
   */
  async getAuditLogs(req, res, next) {
    try {
      const {
        user_id,
        action,
        entity_type,
        entity_id,
        start_date,
        end_date,
        page = 1,
        limit = 50,
      } = req.query;

      const result = await auditService.getLogs({
        userId: user_id,
        action,
        entityType: entity_type,
        entityId: entity_id,
        startDate: start_date,
        endDate: end_date,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/audit-logs/stats
   * Get audit log statistics
   */
  async getAuditStats(req, res, next) {
    try {
      const { days = 7 } = req.query;

      const result = await auditService.getStats(parseInt(days));

      res.json({
        success: true,
        stats: result.stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/audit-logs/user/:user_id
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(req, res, next) {
    try {
      const { user_id } = req.params;
      const { limit = 100 } = req.query;

      const result = await auditService.getUserActivity(user_id, parseInt(limit));

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/audit-logs/entity/:entity_type/:entity_id
   * Get audit trail for a specific entity
   */
  async getEntityAuditLogs(req, res, next) {
    try {
      const { entity_type, entity_id } = req.params;

      const result = await auditService.getEntityHistory(entity_type, entity_id);

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
