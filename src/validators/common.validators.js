const { z } = require('zod');

// Common schemas
const uuid = z.string().uuid('Invalid UUID format');

const email = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .max(100, 'Email must be less than 100 characters');

const phone = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, 'Invalid Indian phone number. Format: +91XXXXXXXXXX');

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

const simplePassword = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must be less than 128 characters');

const otp = z
  .string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only digits');

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const futureDate = date.refine(
  (val) => new Date(val) > new Date(),
  'Date must be in the future'
);

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:MM format');

const pagination = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

const language = z.enum(['english', 'hindi']).default('english');

const role = z.enum(['user', 'lawyer', 'admin']);

const specialization = z.enum([
  'criminal',
  'civil',
  'family',
  'property',
  'corporate',
  'other',
]);

const caseType = z.enum([
  'criminal',
  'civil',
  'family',
  'property',
  'other',
]);

const consultationStatus = z.enum([
  'pending',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]);

const paymentStatus = z.enum([
  'initiated',
  'pending',
  'success',
  'failed',
  'refunded',
]);

const caseStatus = z.enum(['active', 'closed', 'pending']);

const dayOfWeek = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

// Sanitization helpers
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  // Remove HTML tags
  return str.replace(/<[^>]*>/g, '').trim();
};

const sanitizedString = (maxLength = 500, minLength = 0) =>
  z
    .string()
    .min(minLength, `Must be at least ${minLength} characters`)
    .max(maxLength, `Must be less than ${maxLength} characters`)
    .transform(sanitizeString);

const sanitizedText = (maxLength = 5000, minLength = 0) =>
  z
    .string()
    .min(minLength, `Must be at least ${minLength} characters`)
    .max(maxLength, `Must be less than ${maxLength} characters`)
    .transform(sanitizeString);

module.exports = {
  uuid,
  email,
  phone,
  password,
  simplePassword,
  otp,
  date,
  futureDate,
  time,
  pagination,
  language,
  role,
  specialization,
  caseType,
  consultationStatus,
  paymentStatus,
  caseStatus,
  dayOfWeek,
  sanitizedString,
  sanitizedText,
};
