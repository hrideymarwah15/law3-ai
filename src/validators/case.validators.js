const { z } = require('zod');
const { uuid, optionalString, pagination, futureDatetime } = require('./common.validators');

// Case types enum
const caseTypeEnum = z.enum([
  'civil',
  'criminal',
  'family',
  'property',
  'consumer',
  'labour',
  'tax',
  'constitutional',
  'other',
]);

// Case status enum
const caseStatusEnum = z.enum(['active', 'closed', 'pending', 'won', 'lost', 'settled']);

// Reminder type enum
const reminderTypeEnum = z.enum([
  'hearing',
  'document_submission',
  'payment',
  'meeting',
  'custom',
]);

// Reminder status enum
const reminderStatusEnum = z.enum(['pending', 'sent', 'cancelled']);

// Create case
const createCase = z.object({
  body: z.object({
    case_title: z.string().min(3).max(200),
    case_number: z.string().optional(),
    court_name: z.string().optional(),
    case_type: caseTypeEnum.optional().default('other'),
    next_hearing_date: z.string().datetime().optional(),
    lawyer_name: z.string().optional(),
    notes: z.string().max(5000).optional(),
  }),
});

// Update case
const updateCase = z.object({
  params: z.object({
    case_id: uuid,
  }),
  body: z.object({
    case_title: z.string().min(3).max(200).optional(),
    case_number: z.string().optional(),
    court_name: z.string().optional(),
    case_type: caseTypeEnum.optional(),
    next_hearing_date: z.string().datetime().optional().nullable(),
    lawyer_name: z.string().optional(),
    status: caseStatusEnum.optional(),
    notes: z.string().max(5000).optional(),
  }),
});

// Get case by ID
const getCaseById = z.object({
  params: z.object({
    case_id: uuid,
  }),
});

// List cases query
const listCases = z.object({
  query: z.object({
    status: caseStatusEnum.optional(),
    case_type: caseTypeEnum.optional(),
    sort: z.enum(['next_hearing_date', 'created_at']).optional().default('next_hearing_date'),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
});

// Create reminder
const createReminder = z.object({
  body: z.object({
    case_id: uuid,
    reminder_type: reminderTypeEnum.default('custom'),
    reminder_date: z.string().datetime(),
    message: z.string().max(500).optional(),
    send_sms: z.boolean().optional().default(false),
  }),
});

// Update reminder
const updateReminder = z.object({
  params: z.object({
    reminder_id: uuid,
  }),
  body: z.object({
    reminder_date: z.string().datetime().optional(),
    message: z.string().max(500).optional(),
    send_sms: z.boolean().optional(),
    status: reminderStatusEnum.optional(),
  }),
});

// Get reminder by ID
const getReminderById = z.object({
  params: z.object({
    reminder_id: uuid,
  }),
});

// List reminders query
const listReminders = z.object({
  query: z.object({
    status: reminderStatusEnum.optional(),
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  }),
});

// Upcoming reminders query
const upcomingReminders = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(30).optional().default(7),
  }),
});

module.exports = {
  caseTypeEnum,
  caseStatusEnum,
  reminderTypeEnum,
  reminderStatusEnum,
  createCase,
  updateCase,
  getCaseById,
  listCases,
  createReminder,
  updateReminder,
  getReminderById,
  listReminders,
  upcomingReminders,
};
