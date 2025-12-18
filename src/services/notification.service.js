/**
 * Notification Service
 * Centralized service for creating and sending notifications
 */

const { supabaseAdmin } = require('../config/supabase');
const { cache } = require('../config/redis');
const logger = require('../config/logger');

class NotificationService {
  /**
   * Create a notification for a user
   * @param {Object} params
   * @param {string} params.userId - User to notify
   * @param {string} params.title - Notification title
   * @param {string} params.body - Notification body
   * @param {string} params.type - Type (consultation, payment, reminder, etc.)
   * @param {string} [params.category] - Category for filtering
   * @param {string} [params.priority] - Priority (low, normal, high, urgent)
   * @param {string} [params.entityType] - Related entity type
   * @param {string} [params.entityId] - Related entity ID
   * @param {string} [params.actionUrl] - URL to navigate to
   * @param {string[]} [params.channels] - Delivery channels (push, email, sms)
   */
  async create({
    userId,
    title,
    body,
    type,
    category = 'general',
    priority = 'normal',
    entityType,
    entityId,
    actionUrl,
    deepLink,
    imageUrl,
    channels = ['push'],
    expiresAt,
    groupKey,
    metadata = {},
  }) {
    try {
      const { data: notification, error } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          body,
          notification_type: type,
          category,
          priority,
          entity_type: entityType,
          entity_id: entityId,
          action_url: actionUrl,
          deep_link: deepLink,
          image_url: imageUrl,
          channels,
          expires_at: expiresAt,
          group_key: groupKey,
          metadata,
        })
        .select()
        .single();

      if (error) {
        logger.error({ message: 'Failed to create notification', error: error.message, userId });
        throw error;
      }

      // Invalidate cache
      await cache.del(`notifications:unread:${userId}`);

      // Emit socket event for real-time notification
      if (global.io) {
        global.io.to(`user:${userId}`).emit('notification:new', {
          id: notification.id,
          title,
          body,
          type,
          category,
          priority,
          action_url: actionUrl,
          created_at: notification.created_at,
        });
      }

      logger.info({
        message: 'Notification created',
        notificationId: notification.id,
        userId,
        type,
      });

      return notification;
    } catch (error) {
      logger.error({ message: 'Error creating notification', error: error.message });
      // Don't throw - notifications shouldn't break main flows
      return null;
    }
  }

  /**
   * Create notifications for multiple users
   * @param {string[]} userIds
   * @param {Object} notificationData
   */
  async createBulk(userIds, notificationData) {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title: notificationData.title,
        body: notificationData.body,
        notification_type: notificationData.type,
        category: notificationData.category || 'general',
        priority: notificationData.priority || 'normal',
        entity_type: notificationData.entityType,
        entity_id: notificationData.entityId,
        action_url: notificationData.actionUrl,
        channels: notificationData.channels || ['push'],
        metadata: notificationData.metadata || {},
      }));

      // Insert in batches
      const batchSize = 500;
      let created = 0;

      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const { data, error } = await supabaseAdmin
          .from('notifications')
          .insert(batch)
          .select('id, user_id');

        if (error) {
          logger.error({ message: 'Bulk notification batch failed', error: error.message });
          continue;
        }

        created += data.length;

        // Invalidate caches
        for (const n of data) {
          await cache.del(`notifications:unread:${n.user_id}`);
        }
      }

      logger.info({
        message: 'Bulk notifications created',
        count: created,
        type: notificationData.type,
      });

      return { created };
    } catch (error) {
      logger.error({ message: 'Error creating bulk notifications', error: error.message });
      return { created: 0 };
    }
  }

  /**
   * Notify user about consultation status change
   */
  async notifyConsultationStatus(userId, consultation, status, additionalInfo = {}) {
    const statusMessages = {
      confirmed: {
        title: 'Consultation Confirmed',
        body: `Your consultation on ${consultation.booking_date} at ${consultation.booking_time} has been confirmed.`,
      },
      cancelled: {
        title: 'Consultation Cancelled',
        body: `Your consultation on ${consultation.booking_date} has been cancelled. ${additionalInfo.reason || ''}`,
      },
      completed: {
        title: 'Consultation Completed',
        body: 'Your consultation has been marked as completed. Please leave a review!',
      },
      rescheduled: {
        title: 'Consultation Rescheduled',
        body: `Your consultation has been rescheduled to ${additionalInfo.newDate} at ${additionalInfo.newTime}.`,
      },
    };

    const message = statusMessages[status];
    if (!message) return;

    return this.create({
      userId,
      title: message.title,
      body: message.body,
      type: 'consultation',
      category: 'consultation',
      priority: status === 'cancelled' ? 'high' : 'normal',
      entityType: 'consultation',
      entityId: consultation.id,
      actionUrl: `/consultations/${consultation.id}`,
      channels: ['push', 'email'],
    });
  }

  /**
   * Notify user about payment
   */
  async notifyPayment(userId, payment, status) {
    const statusMessages = {
      success: {
        title: 'Payment Successful',
        body: `Your payment of ₹${payment.amount / 100} has been processed successfully.`,
        priority: 'normal',
      },
      failed: {
        title: 'Payment Failed',
        body: `Your payment of ₹${payment.amount / 100} could not be processed. Please try again.`,
        priority: 'high',
      },
      refunded: {
        title: 'Refund Processed',
        body: `A refund of ₹${payment.refund_amount / 100} has been initiated to your account.`,
        priority: 'normal',
      },
    };

    const message = statusMessages[status];
    if (!message) return;

    return this.create({
      userId,
      title: message.title,
      body: message.body,
      type: 'payment',
      category: 'payment',
      priority: message.priority,
      entityType: 'payment',
      entityId: payment.id,
      actionUrl: `/payments/${payment.id}`,
      channels: ['push', 'email', 'sms'],
    });
  }

  /**
   * Notify about new chat message
   */
  async notifyNewMessage(userId, roomId, senderName, messagePreview) {
    return this.create({
      userId,
      title: `New message from ${senderName}`,
      body: messagePreview.length > 100 ? messagePreview.substring(0, 97) + '...' : messagePreview,
      type: 'chat',
      category: 'chat',
      priority: 'normal',
      entityType: 'chat_room',
      entityId: roomId,
      actionUrl: `/chat/${roomId}`,
      groupKey: `chat:${roomId}`, // Group chat notifications
      channels: ['push'],
    });
  }

  /**
   * Notify about meeting ready
   */
  async notifyMeetingReady(userId, consultation) {
    return this.create({
      userId,
      title: 'Your Meeting is Ready',
      body: `Your video consultation is about to start. Click to join now.`,
      type: 'consultation',
      category: 'consultation',
      priority: 'urgent',
      entityType: 'consultation',
      entityId: consultation.id,
      actionUrl: consultation.meeting_link,
      deepLink: `nyaaysaathi://meeting/${consultation.id}`,
      channels: ['push', 'sms'],
    });
  }

  /**
   * Send reminder notification
   */
  async sendReminder(userId, reminder) {
    return this.create({
      userId,
      title: reminder.title,
      body: reminder.description || `You have a reminder: ${reminder.title}`,
      type: 'reminder',
      category: 'reminder',
      priority: 'high',
      entityType: reminder.case_id ? 'case' : (reminder.consultation_id ? 'consultation' : 'reminder'),
      entityId: reminder.case_id || reminder.consultation_id || reminder.id,
      actionUrl: reminder.case_id 
        ? `/cases/${reminder.case_id}`
        : (reminder.consultation_id ? `/consultations/${reminder.consultation_id}` : '/reminders'),
      channels: ['push', 'email'],
    });
  }
}

module.exports = new NotificationService();
