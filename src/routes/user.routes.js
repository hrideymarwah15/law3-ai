const express = require('express');
const router = express.Router();
const { z } = require('zod');

const userController = require('../controllers/user.controller');
const { supabaseAuthMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { email, language, sanitizedString, simplePassword } = require('../validators/common.validators');
const {
  deleteAccountSchema,
  notificationPreferencesSchema,
  requestDataExportSchema,
} = require('../validators/user.validators');

const updateProfileSchema = {
  body: z.object({
    name: sanitizedString(100, 2).optional(),
    email: email.optional(),
    city: sanitizedString(50).optional(),
    language_preference: language.optional(),
  }),
};

const changePasswordSchema = {
  body: z.object({
    current_password: simplePassword,
    new_password: simplePassword,
  }),
};

// All routes require authentication
router.use(supabaseAuthMiddleware);

/**
 * @route GET /api/v1/user/profile
 * @desc Get current user's profile
 * @access Private
 */
router.get(
  '/profile',
  asyncHandler(userController.getProfile)
);

/**
 * @route PUT /api/v1/user/profile
 * @desc Update current user's profile
 * @access Private
 */
router.put(
  '/profile',
  validate(updateProfileSchema),
  asyncHandler(userController.updateProfile)
);

/**
 * @route PUT /api/v1/user/change-password
 * @desc Change password
 * @access Private
 */
router.put(
  '/change-password',
  validate(changePasswordSchema),
  asyncHandler(userController.changePassword)
);

/**
 * @route GET /api/v1/user/notifications/preferences
 * @desc Get notification preferences
 * @access Private
 */
router.get(
  '/notifications/preferences',
  asyncHandler(userController.getNotificationPreferences)
);

/**
 * @route PUT /api/v1/user/notifications/preferences
 * @desc Update notification preferences
 * @access Private
 */
router.put(
  '/notifications/preferences',
  validate({ body: notificationPreferencesSchema }),
  asyncHandler(userController.updateNotificationPreferences)
);

/**
 * @route DELETE /api/v1/user/account
 * @desc Delete (soft delete) user account
 * @access Private
 */
router.delete(
  '/account',
  validate({ body: deleteAccountSchema }),
  asyncHandler(userController.deleteAccount)
);

/**
 * @route POST /api/v1/user/data-export
 * @desc Request data export (GDPR compliance)
 * @access Private
 */
router.post(
  '/data-export',
  validate({ body: requestDataExportSchema }),
  asyncHandler(userController.requestDataExport)
);

module.exports = router;
