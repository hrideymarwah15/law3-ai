/**
 * Notification Validators
 * Production-grade validation schemas for notification endpoints
 */

const { z } = require('zod');
const { uuid, pagination, sanitizedString, sanitizedText } = require('./common.validators');

// Notification types
const notificationType = z.enum([
  'consultation',
  'payment',
  'reminder',
  'promotion',
  'system',
  'chat',
  'review',
  'lawyer_verification',
  'announcement',
]);

// Notification priority
const notificationPriority = z.enum(['low', 'normal', 'high', 'urgent']);

// Notification category
const notificationCategory = z.enum([
  'general',
  'consultation',
  'payment',
  'chat',
  'reminder',
  'promotion',
  'account',
  'legal',
]);

// Get notifications with filters
const getNotificationsSchema = {
  query: z.object({
    is_read: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
    category: notificationCategory.optional(),
    notification_type: notificationType.optional(),
    priority: notificationPriority.optional(),
    ...pagination.shape,
  }),
};

// Get notification by ID
const getNotificationSchema = {
  params: z.object({
    notification_id: uuid,
  }),
};

// Mark notification as read
const markReadSchema = {
  params: z.object({
    notification_id: uuid,
  }),
};

// Mark multiple notifications as read
const markMultipleReadSchema = {
  body: z.object({
    notification_ids: z.array(uuid).min(1).max(100),
  }),
};

// Mark all as read (optional filters)
const markAllReadSchema = {
  body: z.object({
    category: notificationCategory.optional(),
    before_date: z.string().datetime().optional(),
  }).optional(),
};

// Archive notification
const archiveNotificationSchema = {
  params: z.object({
    notification_id: uuid,
  }),
};

// Delete notification
const deleteNotificationSchema = {
  params: z.object({
    notification_id: uuid,
  }),
};

// Delete multiple notifications
const deleteMultipleSchema = {
  body: z.object({
    notification_ids: z.array(uuid).min(1).max(100),
  }),
};

// Get notification preferences
const getPreferencesSchema = {
  // No params needed, uses auth user
};

// Update notification preferences
const updatePreferencesSchema = {
  body: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
    marketing: z.boolean().optional(),
    consultation_reminders: z.boolean().optional(),
    case_updates: z.boolean().optional(),
    payment_alerts: z.boolean().optional(),
    chat_notifications: z.boolean().optional(),
    promotion_notifications: z.boolean().optional(),
    // Quiet hours
    quiet_hours_enabled: z.boolean().optional(),
    quiet_hours_start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    quiet_hours_end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  }),
};

// Admin: Create notification for user(s)
const createNotificationSchema = {
  body: z.object({
    user_ids: z.array(uuid).min(1).max(1000).optional(),
    broadcast: z.boolean().optional().default(false), // Send to all users
    
    title: sanitizedString(255, 3),
    body: sanitizedText(2000, 10),
    notification_type: notificationType,
    category: notificationCategory.optional().default('general'),
    priority: notificationPriority.optional().default('normal'),
    
    // Related entity
    entity_type: z.string().max(50).optional(),
    entity_id: uuid.optional(),
    
    // Action
    action_url: z.string().url().max(500).optional(),
    deep_link: z.string().max(500).optional(),
    
    // Rich notification
    image_url: z.string().url().max(500).optional(),
    
    // Delivery channels
    channels: z.array(z.enum(['push', 'email', 'sms'])).optional().default(['push']),
    
    // Scheduling
    send_at: z.string().datetime().optional(), // For scheduled notifications
    expires_at: z.string().datetime().optional(),
    
    // Options
    is_dismissible: z.boolean().optional().default(true),
    group_key: z.string().max(100).optional(),
  }).refine(
    data => data.user_ids?.length || data.broadcast,
    { message: 'Either user_ids or broadcast must be provided' }
  ),
};

module.exports = {
  notificationType,
  notificationPriority,
  notificationCategory,
  getNotificationsSchema,
  getNotificationSchema,
  markReadSchema,
  markMultipleReadSchema,
  markAllReadSchema,
  archiveNotificationSchema,
  deleteNotificationSchema,
  deleteMultipleSchema,
  getPreferencesSchema,
  updatePreferencesSchema,
  createNotificationSchema,
};
