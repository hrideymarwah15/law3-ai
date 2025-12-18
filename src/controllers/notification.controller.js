/**
 * Notification Controller
 * Production-grade notification management API
 * 
 * Handles:
 * - Get user notifications with filters
 * - Mark as read (single/bulk/all)
 * - Archive/delete notifications
 * - Notification preferences
 * - Unread counts
 */

const { supabaseAdmin } = require('../config/supabase');
const { cache } = require('../config/redis');
const { NotFoundError, ValidationError, ForbiddenError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

class NotificationController {
  /**
   * GET /notifications
   * Get user's notifications with filtering and pagination
   */
  async getNotifications(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        is_read,
        category,
        notification_type,
        priority,
        page = 1,
        limit = 20
      } = req.query;
      
      const offset = (page - 1) * limit;
      
      let query = supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_archived', false);
      
      // Apply filters
      if (typeof is_read === 'boolean') {
        query = query.eq('is_read', is_read);
      }
      if (category) {
        query = query.eq('category', category);
      }
      if (notification_type) {
        query = query.eq('notification_type', notification_type);
      }
      if (priority) {
        query = query.eq('priority', priority);
      }
      
      // Exclude expired notifications
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      
      res.json({
        success: true,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        has_more: offset + data.length < count,
        notifications: data.map(n => this._formatNotification(n)),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /notifications/unread-count
   * Get unread notification count with breakdown
   */
  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.id;
      
      // Try cache first
      const cacheKey = `notifications:unread:${userId}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({ success: true, ...cached, cached: true });
      }
      
      // Get total unread
      const { count: totalUnread } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_archived', false);
      
      // Get breakdown by category
      const { data: categoryBreakdown } = await supabaseAdmin
        .from('notifications')
        .select('category')
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_archived', false);
      
      // Count by category
      const byCategory = {};
      for (const item of categoryBreakdown || []) {
        byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      }
      
      const result = {
        total: totalUnread || 0,
        by_category: byCategory,
      };
      
      // Cache for 30 seconds
      await cache.set(cacheKey, result, 30);
      
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /notifications/:notification_id
   * Get single notification details
   */
  async getNotification(req, res, next) {
    try {
      const userId = req.user.id;
      const { notification_id } = req.params;
      
      const { data: notification, error } = await supabaseAdmin
        .from('notifications')
        .select('*')
        .eq('id', notification_id)
        .eq('user_id', userId)
        .single();
      
      if (error || !notification) {
        throw new NotFoundError('Notification not found');
      }
      
      res.json({
        success: true,
        notification: this._formatNotification(notification),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/:notification_id/read
   * Mark single notification as read
   */
  async markAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const { notification_id } = req.params;
      
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notification_id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Notification not found');
        }
        throw error;
      }
      
      // Invalidate cache
      await cache.del(`notifications:unread:${userId}`);
      
      res.json({
        success: true,
        message: 'Notification marked as read',
        notification: this._formatNotification(data),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/read-multiple
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const { notification_ids } = req.body;
      
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .in('id', notification_ids)
        .eq('user_id', userId)
        .select('id');
      
      if (error) throw error;
      
      // Invalidate cache
      await cache.del(`notifications:unread:${userId}`);
      
      res.json({
        success: true,
        message: `${data.length} notifications marked as read`,
        updated_count: data.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/read-all
   * Mark all notifications as read
   */
  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      const { category, before_date } = req.body || {};
      
      let query = supabaseAdmin
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (category) {
        query = query.eq('category', category);
      }
      if (before_date) {
        query = query.lte('created_at', before_date);
      }
      
      const { data, error } = await query.select('id');
      
      if (error) throw error;
      
      // Invalidate cache
      await cache.del(`notifications:unread:${userId}`);
      
      logger.info({
        message: 'All notifications marked as read',
        userId,
        count: data.length,
        category,
      });
      
      res.json({
        success: true,
        message: `${data.length} notifications marked as read`,
        updated_count: data.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/:notification_id/archive
   * Archive a notification
   */
  async archiveNotification(req, res, next) {
    try {
      const userId = req.user.id;
      const { notification_id } = req.params;
      
      const { data, error } = await supabaseAdmin
        .from('notifications')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq('id', notification_id)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundError('Notification not found');
        }
        throw error;
      }
      
      // Invalidate cache
      await cache.del(`notifications:unread:${userId}`);
      
      res.json({
        success: true,
        message: 'Notification archived',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /notifications/:notification_id
   * Delete a notification permanently
   */
  async deleteNotification(req, res, next) {
    try {
      const userId = req.user.id;
      const { notification_id } = req.params;
      
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('id', notification_id)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Invalidate cache
      await cache.del(`notifications:unread:${userId}`);
      
      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /notifications/delete-multiple
   * Delete multiple notifications
   */
  async deleteMultiple(req, res, next) {
    try {
      const userId = req.user.id;
      const { notification_ids } = req.body;
      
      const { error, count } = await supabaseAdmin
        .from('notifications')
        .delete()
        .in('id', notification_ids)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Invalidate cache
      await cache.del(`notifications:unread:${userId}`);
      
      res.json({
        success: true,
        message: `${notification_ids.length} notifications deleted`,
        deleted_count: notification_ids.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /notifications/preferences
   * Get notification preferences
   */
  async getPreferences(req, res, next) {
    try {
      const userId = req.user.id;
      
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('notification_preferences')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      // Default preferences
      const defaultPreferences = {
        email: true,
        sms: true,
        push: true,
        whatsapp: false,
        marketing: false,
        consultation_reminders: true,
        case_updates: true,
        payment_alerts: true,
        chat_notifications: true,
        newsletter: false,
        quiet_hours: {
          enabled: false,
          start_time: '22:00',
          end_time: '08:00',
          timezone: 'Asia/Kolkata',
        },
        digest_frequency: 'realtime',
      };
      
      res.json({
        success: true,
        preferences: {
          ...defaultPreferences,
          ...user.notification_preferences,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /notifications/preferences
   * Update notification preferences
   */
  async updatePreferences(req, res, next) {
    try {
      const userId = req.user.id;
      const newPreferences = req.body;
      
      // Get current preferences
      const { data: user, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('notification_preferences')
        .eq('id', userId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Merge preferences
      const mergedPreferences = {
        ...(user.notification_preferences || {}),
        ...newPreferences,
      };
      
      // Update
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          notification_preferences: mergedPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      logger.info({
        message: 'Notification preferences updated',
        userId,
        updated_fields: Object.keys(newPreferences),
      });
      
      res.json({
        success: true,
        message: 'Notification preferences updated',
        preferences: mergedPreferences,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /notifications (Admin only)
   * Create notification for user(s)
   */
  async createNotification(req, res, next) {
    try {
      const adminId = req.user.id;
      const {
        user_ids,
        broadcast,
        title,
        body,
        notification_type,
        category = 'general',
        priority = 'normal',
        entity_type,
        entity_id,
        action_url,
        deep_link,
        image_url,
        channels = ['push'],
        send_at,
        expires_at,
        is_dismissible = true,
        group_key,
      } = req.body;
      
      let targetUserIds = user_ids;
      
      // If broadcast, get all active user IDs
      if (broadcast) {
        const { data: users, error: usersError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('status', 'active')
          .eq('is_deleted', false);
        
        if (usersError) throw usersError;
        targetUserIds = users.map(u => u.id);
      }
      
      // Create notifications for all users
      const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        title,
        body,
        notification_type,
        category,
        priority,
        entity_type,
        entity_id,
        action_url,
        deep_link,
        image_url,
        channels,
        expires_at,
        is_dismissible,
        group_key,
        metadata: {
          created_by: adminId,
          broadcast,
        },
      }));
      
      // Insert in batches of 1000
      const batchSize = 1000;
      let totalCreated = 0;
      
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const { data, error } = await supabaseAdmin
          .from('notifications')
          .insert(batch)
          .select('id');
        
        if (error) throw error;
        totalCreated += data.length;
      }
      
      logger.info({
        message: 'Notifications created by admin',
        adminId,
        count: totalCreated,
        broadcast,
      });
      
      res.status(201).json({
        success: true,
        message: `${totalCreated} notifications created`,
        created_count: totalCreated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Format notification for API response
   * @private
   */
  _formatNotification(notification) {
    return {
      id: notification.id,
      title: notification.title,
      body: notification.body,
      type: notification.notification_type,
      category: notification.category || 'general',
      priority: notification.priority || 'normal',
      is_read: notification.is_read,
      read_at: notification.read_at,
      is_archived: notification.is_archived,
      entity: notification.entity_type ? {
        type: notification.entity_type,
        id: notification.entity_id,
      } : null,
      action_url: notification.action_url,
      deep_link: notification.deep_link,
      image_url: notification.image_url,
      is_dismissible: notification.is_dismissible !== false,
      group_key: notification.group_key,
      created_at: notification.created_at,
      expires_at: notification.expires_at,
    };
  }
}

module.exports = new NotificationController();
