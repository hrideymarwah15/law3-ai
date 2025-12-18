const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { supabaseAuthMiddleware, roleMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
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
  resolveDispute,
  updatePlatformSettings,
  lawyerPerformance,
  sendNotification,
  exportReport,
} = require('../validators/admin.validators');
const { adminLimiter } = require('../middleware/rateLimiter');

// All admin routes require authentication and admin role
router.use(supabaseAuthMiddleware);
router.use(roleMiddleware('admin'));
router.use(adminLimiter);

// ============================================
// DASHBOARD & SYSTEM
// ============================================
router.get('/dashboard', adminController.getDashboard);
router.get('/system/health', adminController.getSystemHealth);
router.get('/system/stats', adminController.getSystemStats);

// ============================================
// LAWYER MANAGEMENT
// ============================================
router.get('/lawyers/pending', validate(pendingLawyers), adminController.getPendingLawyers);
router.put('/lawyers/:lawyer_id/verify', validate(verifyLawyer), adminController.verifyLawyer);
router.get('/lawyers/performance', validate(lawyerPerformance), adminController.getLawyerPerformance);

// ============================================
// USER MANAGEMENT
// ============================================
router.get('/users', validate(listUsers), adminController.listUsers);
router.get('/users/:user_id', validate(getUserDetails), adminController.getUserDetails);
router.put('/users/:user_id/ban', validate(toggleUserBan), adminController.toggleUserBan);

// ============================================
// CONSULTATIONS
// ============================================
router.get('/consultations', validate(listConsultations), adminController.listConsultations);
router.post('/consultations/:consultation_id/refund', validate(processRefund), adminController.processRefund);

// ============================================
// REVENUE & ANALYTICS
// ============================================
router.get('/revenue', validate(revenueAnalytics), adminController.getRevenueAnalytics);

// ============================================
// ANNOUNCEMENTS
// ============================================
router.get('/announcements', adminController.listAnnouncements);
router.post('/announcements', validate(createAnnouncement), adminController.createAnnouncement);
router.put('/announcements/:announcement_id', validate(updateAnnouncement), adminController.updateAnnouncement);
router.delete('/announcements/:announcement_id', adminController.deleteAnnouncement);

// ============================================
// DISPUTES
// ============================================
router.get('/disputes', adminController.listDisputes);
router.get('/disputes/:dispute_id', adminController.getDisputeDetails);
router.put('/disputes/:dispute_id/assign', adminController.assignDispute);
router.put('/disputes/:dispute_id/resolve', validate(resolveDispute), adminController.resolveDispute);

// ============================================
// REFUNDS
// ============================================
router.get('/refunds', adminController.listRefunds);

// ============================================
// PLATFORM SETTINGS
// ============================================
router.get('/settings', adminController.getPlatformSettings);
router.put('/settings', validate(updatePlatformSettings), adminController.updatePlatformSettings);

// ============================================
// NOTIFICATIONS
// ============================================
router.post('/notifications/send', validate(sendNotification), adminController.sendNotification);

// ============================================
// REPORTS & EXPORTS
// ============================================
router.get('/reports/export', validate(exportReport), adminController.exportReport);

// ============================================
// AUDIT LOGS
// ============================================
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/audit-logs/stats', adminController.getAuditStats);
router.get('/audit-logs/user/:user_id', adminController.getUserAuditLogs);
router.get('/audit-logs/entity/:entity_type/:entity_id', adminController.getEntityAuditLogs);

module.exports = router;
