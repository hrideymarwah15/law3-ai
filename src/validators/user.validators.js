/**
 * User Validation Schemas
 * 
 * Zod schemas for validating user-related API requests.
 */

const { z } = require('zod');
const {
  uuid,
  email,
  phone,
  password,
  sanitizedString,
  language,
} = require('./common.validators');

/**
 * Update profile schema
 */
const updateProfileSchema = z.object({
  name: sanitizedString(100, 1).optional(),
  first_name: sanitizedString(50, 1).optional(),
  last_name: sanitizedString(50).optional(),
  email: email.optional(),
  phone: phone.optional(),
  city: sanitizedString(50).optional(),
  state: sanitizedString(50).optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional(),
  language_preference: language.optional(),
  avatar_url: z.string().url('Invalid avatar URL').max(500).optional(),
}).strict();

/**
 * Change password schema
 */
const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: password,
  confirm_password: z.string().min(1, 'Confirm password is required'),
}).strict().refine(
  (data) => data.new_password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  }
).refine(
  (data) => data.current_password !== data.new_password,
  {
    message: 'New password must be different from current password',
    path: ['new_password'],
  }
);

/**
 * Delete account schema
 */
const deleteAccountSchema = z.object({
  reason: sanitizedString(500).optional(),
  confirmation: z.literal('DELETE_MY_ACCOUNT', {
    errorMap: () => ({ message: 'Please type "DELETE_MY_ACCOUNT" to confirm' }),
  }),
}).strict();

/**
 * Notification preferences schema
 */
const notificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  push: z.boolean().optional(),
  marketing: z.boolean().optional(),
  consultation_reminders: z.boolean().optional(),
  case_updates: z.boolean().optional(),
}).strict();

/**
 * User search schema
 */
const userSearchSchema = z.object({
  query: sanitizedString(100).optional(),
  role: z.enum(['user', 'lawyer', 'admin']).optional(),
  status: z.enum(['active', 'inactive', 'banned', 'deleted']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort_by: z.enum(['created_at', 'name', 'email', 'last_login']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
}).strict();

/**
 * Ban user schema (admin)
 */
const banUserSchema = z.object({
  reason: sanitizedString(500, 10, 'Ban reason must be at least 10 characters'),
  duration_days: z.coerce.number().min(1).max(365).optional(),
}).strict();

/**
 * User ID param schema
 */
const userIdParamSchema = z.object({
  id: uuid,
});

/**
 * Request data export (GDPR compliance)
 */
const requestDataExportSchema = z.object({
  format: z.enum(['json', 'csv']).optional().default('json'),
  include: z.array(z.enum([
    'profile',
    'consultations',
    'payments',
    'cases',
    'reviews',
    'chat_history',
    'notifications',
  ])).optional().default(['profile', 'consultations', 'payments']),
}).strict();

/**
 * Recover deleted account
 */
const recoverAccountSchema = z.object({
  recovery_token: z.string().min(32).max(100),
  email: email.optional(),
  phone: phone.optional(),
}).strict().refine(
  data => data.email || data.phone,
  { message: 'Either email or phone is required for verification' }
);

/**
 * Upload avatar schema
 */
const uploadAvatarSchema = z.object({
  crop_x: z.coerce.number().min(0).optional(),
  crop_y: z.coerce.number().min(0).optional(),
  crop_width: z.coerce.number().min(50).optional(),
  crop_height: z.coerce.number().min(50).optional(),
}).strict().optional();

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
  notificationPreferencesSchema,
  userSearchSchema,
  banUserSchema,
  userIdParamSchema,
  requestDataExportSchema,
  recoverAccountSchema,
  uploadAvatarSchema,
};
