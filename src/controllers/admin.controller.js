const { supabaseAdmin } = require('../config/supabase');
const { NotFoundError, ValidationError, ForbiddenError } = require('../middleware/errorHandler');
const { cache, redisClient } = require('../config/redis');
const logger = require('../config/logger');
const { auditService, AuditActions } = require('../services/audit.service');
const paymentService = require('../services/payment.service');

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
        is_verified: status === 'verified',
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

  // ============================================
  // SYSTEM HEALTH & MONITORING
  // ============================================

  /**
   * GET /admin/system/health
   * Get detailed system health status
   */
  async getSystemHealth(req, res, next) {
    try {
      const healthChecks = await Promise.allSettled([
        // Database check
        supabaseAdmin.from('users').select('id').limit(1),
        // Redis check
        redisClient?.ping?.() || Promise.resolve('PONG'),
      ]);

      const [dbCheck, redisCheck] = healthChecks;

      // Get active connections count (approximate)
      const io = req.app.get('io');
      const activeConnections = io?.engine?.clientsCount || 0;

      // Get memory usage
      const memUsage = process.memoryUsage();

      res.json({
        success: true,
        health: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          services: {
            database: dbCheck.status === 'fulfilled' ? 'healthy' : 'unhealthy',
            redis: redisCheck.status === 'fulfilled' ? 'healthy' : 'unhealthy',
            websocket: activeConnections > 0 || io ? 'healthy' : 'unavailable',
          },
          metrics: {
            activeConnections,
            memory: {
              heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
              heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
              rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
            },
            nodeVersion: process.version,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/system/stats
   * Get real-time platform statistics
   */
  async getSystemStats(req, res, next) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [
        todayConsultations,
        monthlyConsultations,
        activeUsers,
        pendingDisputes,
        todayRevenue,
      ] = await Promise.all([
        supabaseAdmin
          .from('consultations')
          .select('*', { count: 'exact', head: true })
          .eq('booking_date', today),
        supabaseAdmin
          .from('consultations')
          .select('*', { count: 'exact', head: true })
          .gte('booking_date', thirtyDaysAgo),
        supabaseAdmin
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabaseAdmin
          .from('disputes')
          .select('*', { count: 'exact', head: true })
          .in('status', ['open', 'under_review']),
        supabaseAdmin
          .from('consultations')
          .select('amount')
          .eq('booking_date', today)
          .eq('status', 'completed'),
      ]);

      const todayRevenueTotal = todayRevenue.data?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0;

      res.json({
        success: true,
        stats: {
          today: {
            consultations: todayConsultations.count || 0,
            revenue: todayRevenueTotal,
          },
          monthly: {
            consultations: monthlyConsultations.count || 0,
          },
          platform: {
            activeUsers: activeUsers.count || 0,
            pendingDisputes: pendingDisputes.count || 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // ANNOUNCEMENTS
  // ============================================

  /**
   * GET /admin/announcements
   * List all announcements
   */
  async listAnnouncements(req, res, next) {
    try {
      const { is_active, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('announcements')
        .select('*', { count: 'exact' });

      if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      res.json({
        success: true,
        total: count,
        page,
        limit,
        announcements: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/announcements
   * Create a new announcement
   */
  async createAnnouncement(req, res, next) {
    try {
      const { title, content, type, target_audience, expires_at, is_active } = req.body;

      const { data, error } = await supabaseAdmin
        .from('announcements')
        .insert({
          title,
          content,
          type,
          target_audience,
          expires_at,
          is_active,
          created_by: req.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await auditService.log({
        action: 'ANNOUNCEMENT_CREATED',
        userId: req.user.id,
        entityType: 'announcement',
        entityId: data.id,
        newData: { title, type, target_audience },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Clear cache
      await cache.del('announcements:active');

      logger.info({ message: 'Announcement created', announcementId: data.id, adminId: req.user.id });

      res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        announcement: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /admin/announcements/:announcement_id
   * Update an announcement
   */
  async updateAnnouncement(req, res, next) {
    try {
      const { announcement_id } = req.params;
      const updateData = req.body;

      const { data: oldData } = await supabaseAdmin
        .from('announcements')
        .select('*')
        .eq('id', announcement_id)
        .single();

      if (!oldData) {
        throw new NotFoundError('Announcement not found');
      }

      const { data, error } = await supabaseAdmin
        .from('announcements')
        .update({ ...updateData, updated_at: new Date().toISOString() })
        .eq('id', announcement_id)
        .select()
        .single();

      if (error) throw error;

      await auditService.log({
        action: 'ANNOUNCEMENT_UPDATED',
        userId: req.user.id,
        entityType: 'announcement',
        entityId: announcement_id,
        oldData,
        newData: updateData,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      await cache.del('announcements:active');

      res.json({
        success: true,
        message: 'Announcement updated successfully',
        announcement: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /admin/announcements/:announcement_id
   * Delete an announcement
   */
  async deleteAnnouncement(req, res, next) {
    try {
      const { announcement_id } = req.params;

      const { error } = await supabaseAdmin
        .from('announcements')
        .delete()
        .eq('id', announcement_id);

      if (error) throw error;

      await cache.del('announcements:active');

      res.json({
        success: true,
        message: 'Announcement deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // DISPUTES
  // ============================================

  /**
   * GET /admin/disputes
   * List all disputes
   */
  async listDisputes(req, res, next) {
    try {
      const { status, priority, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('disputes')
        .select(`
          *,
          consultation:consultations(id, booking_date, booking_time, amount),
          reporter:users!disputes_reported_by_fkey(id, display_name, email),
          reported_user:users!disputes_reported_against_fkey(id, display_name, email),
          assignee:users!disputes_assigned_to_fkey(id, display_name)
        `, { count: 'exact' });

      if (status) query = query.eq('status', status);
      if (priority) query = query.eq('priority', priority);

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      res.json({
        success: true,
        total: count,
        page,
        limit,
        disputes: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/disputes/:dispute_id
   * Get dispute details
   */
  async getDisputeDetails(req, res, next) {
    try {
      const { dispute_id } = req.params;

      const { data, error } = await supabaseAdmin
        .from('disputes')
        .select(`
          *,
          consultation:consultations(*,
            user:users!consultations_user_id_fkey(id, display_name, email, phone),
            lawyer:lawyers!consultations_lawyer_id_fkey(id, user_id,
              user:users!lawyers_user_id_fkey(id, display_name, email, phone)
            )
          ),
          reporter:users!disputes_reported_by_fkey(*),
          reported_user:users!disputes_reported_against_fkey(*),
          assignee:users!disputes_assigned_to_fkey(id, display_name, email)
        `)
        .eq('id', dispute_id)
        .single();

      if (error || !data) {
        throw new NotFoundError('Dispute not found');
      }

      res.json({
        success: true,
        dispute: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /admin/disputes/:dispute_id/assign
   * Assign dispute to an admin
   */
  async assignDispute(req, res, next) {
    try {
      const { dispute_id } = req.params;
      const adminId = req.user.id;

      const { data, error } = await supabaseAdmin
        .from('disputes')
        .update({
          assigned_to: adminId,
          status: 'under_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', dispute_id)
        .select()
        .single();

      if (error) throw error;

      logger.info({ message: 'Dispute assigned', disputeId: dispute_id, adminId });

      res.json({
        success: true,
        message: 'Dispute assigned to you',
        dispute: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /admin/disputes/:dispute_id/resolve
   * Resolve a dispute
   */
  async resolveDispute(req, res, next) {
    try {
      const { dispute_id } = req.params;
      const { resolution, resolution_notes, refund_amount, warn_user, warn_lawyer } = req.body;

      // Get dispute details
      const { data: dispute, error: fetchError } = await supabaseAdmin
        .from('disputes')
        .select('*, consultation:consultations(*)')
        .eq('id', dispute_id)
        .single();

      if (fetchError || !dispute) {
        throw new NotFoundError('Dispute not found');
      }

      // Update dispute
      const { data, error } = await supabaseAdmin
        .from('disputes')
        .update({
          status: 'resolved',
          resolution,
          resolution_notes,
          refund_amount,
          user_warned: warn_user || false,
          lawyer_warned: warn_lawyer || false,
          resolved_at: new Date().toISOString(),
          resolved_by: req.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dispute_id)
        .select()
        .single();

      if (error) throw error;

      // Process refund if needed
      if (resolution === 'refunded' && refund_amount > 0 && dispute.consultation) {
        try {
          // Find payment for this consultation
          const { data: payment } = await supabaseAdmin
            .from('payments')
            .select('razorpay_payment_id')
            .eq('consultation_id', dispute.consultation.id)
            .eq('status', 'success')
            .single();

          if (payment?.razorpay_payment_id) {
            await paymentService.initiateRefund(payment.razorpay_payment_id, refund_amount);
          }
        } catch (refundError) {
          logger.error({ message: 'Refund failed during dispute resolution', error: refundError.message });
        }
      }

      // Issue warnings if needed
      if (warn_user && dispute.reported_against) {
        await this._issueWarning(dispute.reported_against, dispute_id, 'User warning from dispute resolution', req.user.id);
      }
      if (warn_lawyer && dispute.consultation?.lawyer_id) {
        const { data: lawyer } = await supabaseAdmin
          .from('lawyers')
          .select('user_id')
          .eq('id', dispute.consultation.lawyer_id)
          .single();
        if (lawyer) {
          await this._issueWarning(lawyer.user_id, dispute_id, 'Lawyer warning from dispute resolution', req.user.id);
        }
      }

      await auditService.log({
        action: 'DISPUTE_RESOLVED',
        userId: req.user.id,
        entityType: 'dispute',
        entityId: dispute_id,
        newData: { resolution, refund_amount, warn_user, warn_lawyer },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      logger.info({ message: 'Dispute resolved', disputeId: dispute_id, resolution, adminId: req.user.id });

      res.json({
        success: true,
        message: 'Dispute resolved successfully',
        dispute: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Helper: Issue warning to user
   */
  async _issueWarning(userId, disputeId, reason, issuedBy) {
    await supabaseAdmin.from('user_warnings').insert({
      user_id: userId,
      dispute_id: disputeId,
      reason,
      severity: 'warning',
      issued_by: issuedBy,
    });

    // Increment warning count
    await supabaseAdmin.rpc('increment', {
      table_name: 'users',
      column_name: 'warning_count',
      row_id: userId,
    });
  }

  // ============================================
  // REFUNDS
  // ============================================

  /**
   * GET /admin/refunds
   * List all refund requests/history
   */
  async listRefunds(req, res, next) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('payments')
        .select(`
          *,
          consultation:consultations(id, booking_date, status, amount),
          user:users!payments_user_id_fkey(id, display_name, email)
        `, { count: 'exact' })
        .not('refund_amount', 'is', null);

      if (status) query = query.eq('status', status);

      const { data, error, count } = await query
        .order('refund_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      res.json({
        success: true,
        total: count,
        page,
        limit,
        refunds: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/consultations/:consultation_id/refund
   * Process a refund for a consultation
   */
  async processRefund(req, res, next) {
    try {
      const { consultation_id } = req.params;
      const { refund_type, amount, reason } = req.body;

      // Get consultation and payment details
      const { data: consultation, error: fetchError } = await supabaseAdmin
        .from('consultations')
        .select('*, payments(*)')
        .eq('id', consultation_id)
        .single();

      if (fetchError || !consultation) {
        throw new NotFoundError('Consultation not found');
      }

      const payment = consultation.payments?.[0];
      if (!payment?.razorpay_payment_id) {
        throw new ValidationError('No payment found for this consultation');
      }

      const refundAmount = refund_type === 'full' ? consultation.amount : amount;
      if (!refundAmount || refundAmount <= 0) {
        throw new ValidationError('Invalid refund amount');
      }

      // Process refund through Razorpay
      try {
        await paymentService.initiateRefund(payment.razorpay_payment_id, refundAmount);
      } catch (refundError) {
        throw new ValidationError(`Refund failed: ${refundError.message}`);
      }

      // Update payment record
      await supabaseAdmin
        .from('payments')
        .update({
          status: refund_type === 'full' ? 'refunded' : 'partially_refunded',
          refund_amount: refundAmount,
          refund_date: new Date().toISOString(),
          refund_reason: reason,
        })
        .eq('id', payment.id);

      await auditService.log({
        action: 'REFUND_PROCESSED',
        userId: req.user.id,
        entityType: 'payment',
        entityId: payment.id,
        newData: { refund_type, amount: refundAmount, reason },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      logger.info({
        message: 'Refund processed',
        consultationId: consultation_id,
        amount: refundAmount,
        adminId: req.user.id,
      });

      res.json({
        success: true,
        message: 'Refund processed successfully',
        refund: {
          amount: refundAmount,
          type: refund_type,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // PLATFORM SETTINGS
  // ============================================

  /**
   * GET /admin/settings
   * Get all platform settings
   */
  async getPlatformSettings(req, res, next) {
    try {
      const { data, error } = await supabaseAdmin
        .from('platform_settings')
        .select('*')
        .order('key');

      if (error) throw error;

      // Convert to key-value object
      const settings = {};
      data.forEach((s) => {
        settings[s.key] = {
          value: s.value,
          description: s.description,
          updated_at: s.updated_at,
        };
      });

      res.json({
        success: true,
        settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /admin/settings
   * Update platform settings
   */
  async updatePlatformSettings(req, res, next) {
    try {
      const updates = req.body;
      const updatedKeys = [];

      for (const [key, value] of Object.entries(updates)) {
        const { error } = await supabaseAdmin
          .from('platform_settings')
          .update({
            value: JSON.stringify(value),
            updated_by: req.user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('key', key);

        if (!error) {
          updatedKeys.push(key);
        }
      }

      await auditService.log({
        action: 'PLATFORM_SETTINGS_UPDATED',
        userId: req.user.id,
        entityType: 'platform_settings',
        newData: updates,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Clear settings cache
      await cache.del('platform:settings');

      res.json({
        success: true,
        message: 'Settings updated successfully',
        updated: updatedKeys,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // LAWYER PERFORMANCE ANALYTICS
  // ============================================

  /**
   * GET /admin/lawyers/performance
   * Get lawyer performance analytics
   */
  async getLawyerPerformance(req, res, next) {
    try {
      const { sort_by = 'rating', order = 'desc', specialization, min_consultations = 0, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('lawyers')
        .select(`
          *,
          user:users!lawyers_user_id_fkey(id, display_name, email, created_at)
        `, { count: 'exact' })
        .eq('is_verified', true)
        .gte('total_consultations', min_consultations);

      if (specialization) {
        query = query.eq('specialization', specialization);
      }

      // Sort by different metrics
      const sortColumn = {
        rating: 'rating',
        consultations: 'total_consultations',
        revenue: 'total_consultations', // Proxy for revenue
        response_time: 'rating', // Would need separate tracking
      }[sort_by] || 'rating';

      query = query.order(sortColumn, { ascending: order === 'asc' });

      const { data, error, count } = await query.range(offset, offset + limit - 1);

      if (error) throw error;

      // Calculate additional metrics for each lawyer
      const lawyersWithMetrics = await Promise.all(
        data.map(async (lawyer) => {
          const { data: consultations } = await supabaseAdmin
            .from('consultations')
            .select('status, amount')
            .eq('lawyer_id', lawyer.id);

          const completed = consultations?.filter((c) => c.status === 'completed') || [];
          const cancelled = consultations?.filter((c) => c.status === 'cancelled') || [];
          const totalRevenue = completed.reduce((sum, c) => sum + (c.amount || 0), 0);

          return {
            ...lawyer,
            metrics: {
              total_revenue: totalRevenue,
              completion_rate: consultations?.length
                ? Math.round((completed.length / consultations.length) * 100)
                : 0,
              cancellation_rate: consultations?.length
                ? Math.round((cancelled.length / consultations.length) * 100)
                : 0,
            },
          };
        })
      );

      res.json({
        success: true,
        total: count,
        page,
        limit,
        lawyers: lawyersWithMetrics,
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  /**
   * POST /admin/notifications/send
   * Send bulk notification
   */
  async sendNotification(req, res, next) {
    try {
      const { target, user_ids, title, message, type } = req.body;

      // Validate specific users if target is 'specific'
      if (target === 'specific' && (!user_ids || user_ids.length === 0)) {
        throw new ValidationError('user_ids required when target is specific');
      }

      let targetUsers = [];

      if (target === 'all') {
        const { data } = await supabaseAdmin.from('users').select('id').eq('is_active', true);
        targetUsers = data?.map((u) => u.id) || [];
      } else if (target === 'users') {
        const { data } = await supabaseAdmin.from('users').select('id').eq('role', 'user').eq('is_active', true);
        targetUsers = data?.map((u) => u.id) || [];
      } else if (target === 'lawyers') {
        const { data } = await supabaseAdmin.from('users').select('id').eq('role', 'lawyer').eq('is_active', true);
        targetUsers = data?.map((u) => u.id) || [];
      } else {
        targetUsers = user_ids;
      }

      // Create notification record
      const { data: notification, error } = await supabaseAdmin
        .from('admin_notifications')
        .insert({
          title,
          message,
          type,
          target,
          target_user_ids: targetUsers,
          sent_count: 0,
          status: 'pending',
          sent_by: req.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send via Socket.io for in_app notifications
      if (type === 'in_app') {
        const io = req.app.get('io');
        if (io) {
          for (const userId of targetUsers) {
            io.to(`user:${userId}`).emit('notification', {
              id: notification.id,
              title,
              message,
              type: 'admin_notification',
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Update sent count
        await supabaseAdmin
          .from('admin_notifications')
          .update({
            sent_count: targetUsers.length,
            status: 'completed',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);
      }

      logger.info({
        message: 'Bulk notification sent',
        notificationId: notification.id,
        target,
        recipientCount: targetUsers.length,
        adminId: req.user.id,
      });

      res.json({
        success: true,
        message: 'Notification sent successfully',
        notification: {
          id: notification.id,
          recipients: targetUsers.length,
          status: type === 'in_app' ? 'completed' : 'queued',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // REPORTS & EXPORTS
  // ============================================

  /**
   * GET /admin/reports/export
   * Export data as CSV or JSON
   */
  async exportReport(req, res, next) {
    try {
      const { report_type, format = 'csv', from_date, to_date } = req.query;

      let data = [];
      let filename = `${report_type}_report_${new Date().toISOString().split('T')[0]}`;

      switch (report_type) {
        case 'users': {
          const result = await supabaseAdmin
            .from('users')
            .select('id, display_name, email, phone, role, is_active, created_at');
          data = result.data || [];
          break;
        }
        case 'lawyers': {
          const result = await supabaseAdmin
            .from('lawyers')
            .select(`
              id, bar_council_number, specialization, experience_years, 
              consultation_fee, rating, total_reviews, total_consultations,
              is_verified, verification_status, created_at,
              user:users!lawyers_user_id_fkey(display_name, email)
            `);
          data = result.data || [];
          break;
        }
        case 'consultations': {
          let query = supabaseAdmin
            .from('consultations')
            .select('id, reference_number, booking_date, booking_time, status, amount, consultation_type, created_at');
          if (from_date) query = query.gte('booking_date', from_date);
          if (to_date) query = query.lte('booking_date', to_date);
          const result = await query;
          data = result.data || [];
          break;
        }
        case 'revenue': {
          let query = supabaseAdmin
            .from('consultations')
            .select('booking_date, amount, status')
            .eq('status', 'completed');
          if (from_date) query = query.gte('booking_date', from_date);
          if (to_date) query = query.lte('booking_date', to_date);
          const result = await query;
          data = result.data || [];
          break;
        }
        case 'disputes': {
          const result = await supabaseAdmin
            .from('disputes')
            .select('id, issue_type, status, priority, resolution, created_at, resolved_at');
          data = result.data || [];
          break;
        }
        default:
          throw new ValidationError('Invalid report type');
      }

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        return res.json(data);
      }

      // Convert to CSV
      if (data.length === 0) {
        return res.status(200).send('No data available');
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          headers
            .map((header) => {
              let value = row[header];
              if (typeof value === 'object') value = JSON.stringify(value);
              if (typeof value === 'string' && value.includes(',')) value = `"${value}"`;
              return value ?? '';
            })
            .join(',')
        ),
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvRows.join('\n'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
