const { z } = require('zod');
const { uuid, pagination } = require('./common.validators');

// Verify lawyer
const verifyLawyer = z.object({
  params: z.object({
    lawyer_id: uuid,
  }),
  body: z.object({
    status: z.enum(['verified', 'rejected']),
    rejection_reason: z.string().max(500).optional(),
  }),
});

// List users
const listUsers = z.object({
  query: z.object({
    role: z.enum(['user', 'lawyer', 'admin']).optional(),
    search: z.string().max(100).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

// Get user details
const getUserDetails = z.object({
  params: z.object({
    user_id: uuid,
  }),
});

// Toggle user ban
const toggleUserBan = z.object({
  params: z.object({
    user_id: uuid,
  }),
  body: z.object({
    banned: z.boolean(),
    reason: z.string().max(500).optional(),
  }),
});

// List consultations
const listConsultations = z.object({
  query: z.object({
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

// Revenue analytics
const revenueAnalytics = z.object({
  query: z.object({
    period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
    from_date: z.string().datetime().optional(),
    to_date: z.string().datetime().optional(),
  }),
});

// Pending lawyers pagination
const pendingLawyers = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

module.exports = {
  verifyLawyer,
  listUsers,
  getUserDetails,
  toggleUserBan,
  listConsultations,
  revenueAnalytics,
  pendingLawyers,
};
