/**
 * Audit Log Service
 * Tracks all important actions in the system for security and compliance
 */

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');

// Action types for audit logging
const AuditActions = {
  // Authentication
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_SIGNUP: 'user.signup',
  USER_PASSWORD_RESET: 'user.password_reset',
  USER_PASSWORD_CHANGE: 'user.password_change',
  
  // User Management
  USER_PROFILE_UPDATE: 'user.profile_update',
  USER_ROLE_CHANGE: 'user.role_change',
  USER_DELETED: 'user.deleted',
  USER_SUSPENDED: 'user.suspended',
  USER_ACTIVATED: 'user.activated',
  
  // Lawyer Management
  LAWYER_PROFILE_CREATE: 'lawyer.profile_create',
  LAWYER_PROFILE_UPDATE: 'lawyer.profile_update',
  LAWYER_VERIFIED: 'lawyer.verified',
  LAWYER_REJECTED: 'lawyer.rejected',
  LAWYER_AVAILABILITY_UPDATE: 'lawyer.availability_update',
  
  // Consultation
  CONSULTATION_BOOKED: 'consultation.booked',
  CONSULTATION_CANCELLED: 'consultation.cancelled',
  CONSULTATION_COMPLETED: 'consultation.completed',
  CONSULTATION_RESCHEDULED: 'consultation.rescheduled',
  
  // Payment
  PAYMENT_INITIATED: 'payment.initiated',
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUND: 'payment.refund',
  
  // Case Management
  CASE_CREATED: 'case.created',
  CASE_UPDATED: 'case.updated',
  CASE_STATUS_CHANGE: 'case.status_change',
  CASE_DOCUMENT_UPLOAD: 'case.document_upload',
  
  // Admin Actions
  ADMIN_USER_BAN: 'admin.user_ban',
  ADMIN_USER_UNBAN: 'admin.user_unban',
  ADMIN_SETTINGS_CHANGE: 'admin.settings_change',
  ADMIN_DATA_EXPORT: 'admin.data_export',
  
  // System
  SYSTEM_ERROR: 'system.error',
  API_RATE_LIMIT: 'api.rate_limit',
};

class AuditService {
  /**
   * Log an audit event
   * @param {Object} params - Audit parameters
   * @param {string} params.action - Action type from AuditActions
   * @param {string} params.userId - User ID who performed the action
   * @param {string} params.entityType - Type of entity affected (user, lawyer, consultation, etc.)
   * @param {string} params.entityId - ID of the affected entity
   * @param {Object} params.oldData - Previous state (for updates)
   * @param {Object} params.newData - New state (for creates/updates)
   * @param {string} params.ipAddress - Client IP address
   * @param {string} params.userAgent - Client user agent
   */
  async log({
    action,
    userId = null,
    entityType = null,
    entityId = null,
    oldData = null,
    newData = null,
    ipAddress = null,
    userAgent = null,
  }) {
    try {
      // Sanitize sensitive data before logging
      const sanitizedOldData = this.sanitizeData(oldData);
      const sanitizedNewData = this.sanitizeData(newData);

      const { error } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          action,
          user_id: userId,
          entity_type: entityType,
          entity_id: entityId,
          old_data: sanitizedOldData,
          new_data: sanitizedNewData,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

      if (error) {
        logger.error({ 
          message: 'Failed to create audit log', 
          error: error.message,
          action,
          userId 
        });
        // Don't throw - audit logging should never break the main flow
        return { success: false, error: error.message };
      }

      logger.debug({ 
        message: 'Audit log created', 
        action, 
        userId, 
        entityType, 
        entityId 
      });

      return { success: true };
    } catch (error) {
      logger.error({ message: 'Audit service error', error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove sensitive fields from data before logging
   */
  sanitizeData(data) {
    if (!data) return null;

    const sensitiveFields = [
      'password',
      'otp',
      'otp_code',
      'token',
      'access_token',
      'refresh_token',
      'api_key',
      'secret',
      'credit_card',
      'card_number',
      'cvv',
    ];

    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Handle nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Get audit logs with filtering
   * @param {Object} filters - Query filters
   */
  async getLogs({
    userId = null,
    action = null,
    entityType = null,
    entityId = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 50,
  }) {
    try {
      let query = supabaseAdmin
        .from('audit_logs')
        .select('*, users:user_id(name, email)', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (action) {
        if (action.includes('*')) {
          // Wildcard search (e.g., 'user.*' matches all user actions)
          const actionPrefix = action.replace('*', '');
          query = query.ilike('action', `${actionPrefix}%`);
        } else {
          query = query.eq('action', action);
        }
      }

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      // Pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          total_pages: Math.ceil((count || 0) / limit),
        },
      };
    } catch (error) {
      logger.error({ message: 'Failed to fetch audit logs', error: error.message });
      throw error;
    }
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityHistory(entityType, entityId) {
    try {
      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*, users:user_id(name, email)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true, data: data || [] };
    } catch (error) {
      logger.error({ message: 'Failed to fetch entity history', error: error.message });
      throw error;
    }
  }

  /**
   * Get user activity history
   */
  async getUserActivity(userId, limit = 100) {
    try {
      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true, data: data || [] };
    } catch (error) {
      logger.error({ message: 'Failed to fetch user activity', error: error.message });
      throw error;
    }
  }

  /**
   * Get audit statistics for dashboard
   */
  async getStats(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('action, created_at')
        .gte('created_at', startDate.toISOString());

      if (error) {
        throw new Error(error.message);
      }

      // Group by action
      const actionCounts = {};
      const dailyCounts = {};

      for (const log of data || []) {
        // Count by action
        const actionCategory = log.action.split('.')[0];
        actionCounts[actionCategory] = (actionCounts[actionCategory] || 0) + 1;

        // Count by day
        const day = log.created_at.split('T')[0];
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      }

      return {
        success: true,
        stats: {
          total_events: data?.length || 0,
          by_category: actionCounts,
          by_day: dailyCounts,
        },
      };
    } catch (error) {
      logger.error({ message: 'Failed to get audit stats', error: error.message });
      throw error;
    }
  }

  /**
   * Cleanup old audit logs (retention policy)
   * @param {number} retentionDays - Days to keep logs (default: 90)
   */
  async cleanupOldLogs(retentionDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        throw new Error(error.message);
      }

      const deletedCount = data?.length || 0;
      logger.info({ 
        message: 'Audit logs cleanup completed', 
        deleted: deletedCount,
        retentionDays 
      });

      return { success: true, deleted: deletedCount };
    } catch (error) {
      logger.error({ message: 'Failed to cleanup audit logs', error: error.message });
      throw error;
    }
  }
}

// Export both the service instance and action types
module.exports = {
  auditService: new AuditService(),
  AuditActions,
};
