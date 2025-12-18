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
    is_banned: z.coerce.boolean().optional(),
    is_active: z.coerce.boolean().optional(),
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
    consultation_type: z.enum(['video', 'audio', 'in_person']).optional(),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
    lawyer_id: z.string().uuid().optional(),
    user_id: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

// Revenue analytics
const revenueAnalytics = z.object({
  query: z.object({
    period: z.enum(['week', 'month', 'quarter', 'year']).optional().default('month'),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
  }),
});

// Pending lawyers pagination
const pendingLawyers = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

// Create announcement
const createAnnouncement = z.object({
  body: z.object({
    title: z.string().min(3).max(200),
    content: z.string().min(10).max(5000),
    type: z.enum(['info', 'warning', 'urgent', 'maintenance']).default('info'),
    target_audience: z.enum(['all', 'users', 'lawyers']).default('all'),
    expires_at: z.string().datetime().optional(),
    is_active: z.boolean().default(true),
  }),
});

// Update announcement
const updateAnnouncement = z.object({
  params: z.object({
    announcement_id: uuid,
  }),
  body: z.object({
    title: z.string().min(3).max(200).optional(),
    content: z.string().min(10).max(5000).optional(),
    type: z.enum(['info', 'warning', 'urgent', 'maintenance']).optional(),
    target_audience: z.enum(['all', 'users', 'lawyers']).optional(),
    expires_at: z.string().datetime().nullable().optional(),
    is_active: z.boolean().optional(),
  }),
});

// Process refund
const processRefund = z.object({
  params: z.object({
    consultation_id: uuid,
  }),
  body: z.object({
    refund_type: z.enum(['full', 'partial']),
    amount: z.number().positive().optional(), // Required for partial refund
    reason: z.string().min(10).max(500),
  }),
});

// Create dispute
const createDispute = z.object({
  body: z.object({
    consultation_id: uuid,
    reported_by: uuid,
    issue_type: z.enum(['no_show', 'poor_service', 'misconduct', 'payment_issue', 'other']),
    description: z.string().min(20).max(2000),
  }),
});

// Resolve dispute
const resolveDispute = z.object({
  params: z.object({
    dispute_id: uuid,
  }),
  body: z.object({
    resolution: z.enum(['resolved_for_user', 'resolved_for_lawyer', 'dismissed', 'refunded']),
    resolution_notes: z.string().min(10).max(1000),
    refund_amount: z.number().positive().optional(),
    warn_user: z.boolean().optional(),
    warn_lawyer: z.boolean().optional(),
  }),
});

// Platform settings
const updatePlatformSettings = z.object({
  body: z.object({
    platform_commission_percent: z.number().min(0).max(50).optional(),
    min_consultation_fee: z.number().positive().optional(),
    max_consultation_fee: z.number().positive().optional(),
    cancellation_window_hours: z.number().min(1).max(72).optional(),
    auto_complete_after_hours: z.number().min(1).max(168).optional(),
    maintenance_mode: z.boolean().optional(),
    new_registrations_enabled: z.boolean().optional(),
  }),
});

// Lawyer performance query
const lawyerPerformance = z.object({
  query: z.object({
    sort_by: z.enum(['rating', 'consultations', 'revenue', 'response_time']).optional().default('rating'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    specialization: z.string().optional(),
    min_consultations: z.coerce.number().int().min(0).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

// Send notification
const sendNotification = z.object({
  body: z.object({
    target: z.enum(['all', 'users', 'lawyers', 'specific']),
    user_ids: z.array(uuid).optional(), // Required when target is 'specific'
    title: z.string().min(3).max(100),
    message: z.string().min(10).max(500),
    type: z.enum(['push', 'email', 'sms', 'in_app']).default('in_app'),
  }),
});

// Export reports
const exportReport = z.object({
  query: z.object({
    report_type: z.enum(['users', 'lawyers', 'consultations', 'revenue', 'disputes']),
    format: z.enum(['csv', 'json']).default('csv'),
    from_date: z.string().optional(),
    to_date: z.string().optional(),
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
  createAnnouncement,
  updateAnnouncement,
  processRefund,
  createDispute,
  resolveDispute,
  updatePlatformSettings,
  lawyerPerformance,
  sendNotification,
  exportReport,
};
