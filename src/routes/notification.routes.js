/**
 * Notification Routes
 * Complete notification management API
 */

const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notification.controller');
const { supabaseAuthMiddleware, roleMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

const {
  getNotificationsSchema,
  getNotificationSchema,
  markReadSchema,
  markMultipleReadSchema,
  markAllReadSchema,
  archiveNotificationSchema,
  deleteNotificationSchema,
  deleteMultipleSchema,
  updatePreferencesSchema,
  createNotificationSchema,
} = require('../validators/notification.validators');

// All routes require authentication
router.use(supabaseAuthMiddleware);

/**
 * @route GET /api/v1/notifications
 * @desc Get user's notifications with filters
 * @access Private
 */
router.get(
  '/',
  validate(getNotificationsSchema),
  asyncHandler(notificationController.getNotifications.bind(notificationController))
);

/**
 * @route GET /api/v1/notifications/unread-count
 * @desc Get unread notification count with breakdown
 * @access Private
 */
router.get(
  '/unread-count',
  asyncHandler(notificationController.getUnreadCount.bind(notificationController))
);

/**
 * @route GET /api/v1/notifications/preferences
 * @desc Get notification preferences
 * @access Private
 */
router.get(
  '/preferences',
  asyncHandler(notificationController.getPreferences.bind(notificationController))
);

/**
 * @route PUT /api/v1/notifications/preferences
 * @desc Update notification preferences
 * @access Private
 */
router.put(
  '/preferences',
  validate(updatePreferencesSchema),
  asyncHandler(notificationController.updatePreferences.bind(notificationController))
);

/**
 * @route PUT /api/v1/notifications/read-multiple
 * @desc Mark multiple notifications as read
 * @access Private
 */
router.put(
  '/read-multiple',
  validate(markMultipleReadSchema),
  asyncHandler(notificationController.markMultipleAsRead.bind(notificationController))
);

/**
 * @route PUT /api/v1/notifications/read-all
 * @desc Mark all notifications as read
 * @access Private
 */
router.put(
  '/read-all',
  validate(markAllReadSchema),
  asyncHandler(notificationController.markAllAsRead.bind(notificationController))
);

/**
 * @route DELETE /api/v1/notifications/delete-multiple
 * @desc Delete multiple notifications
 * @access Private
 */
router.delete(
  '/delete-multiple',
  validate(deleteMultipleSchema),
  asyncHandler(notificationController.deleteMultiple.bind(notificationController))
);

/**
 * @route GET /api/v1/notifications/:notification_id
 * @desc Get single notification details
 * @access Private
 */
router.get(
  '/:notification_id',
  validate(getNotificationSchema),
  asyncHandler(notificationController.getNotification.bind(notificationController))
);

/**
 * @route PUT /api/v1/notifications/:notification_id/read
 * @desc Mark notification as read
 * @access Private
 */
router.put(
  '/:notification_id/read',
  validate(markReadSchema),
  asyncHandler(notificationController.markAsRead.bind(notificationController))
);

/**
 * @route PUT /api/v1/notifications/:notification_id/archive
 * @desc Archive a notification
 * @access Private
 */
router.put(
  '/:notification_id/archive',
  validate(archiveNotificationSchema),
  asyncHandler(notificationController.archiveNotification.bind(notificationController))
);

/**
 * @route DELETE /api/v1/notifications/:notification_id
 * @desc Delete a notification
 * @access Private
 */
router.delete(
  '/:notification_id',
  validate(deleteNotificationSchema),
  asyncHandler(notificationController.deleteNotification.bind(notificationController))
);

/**
 * @route POST /api/v1/notifications (Admin only)
 * @desc Create notification for user(s) - Admin only
 * @access Admin
 */
router.post(
  '/',
  roleMiddleware('admin'),
  validate(createNotificationSchema),
  asyncHandler(notificationController.createNotification.bind(notificationController))
);

module.exports = router;
