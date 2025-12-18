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
} = require('../validators/admin.validators');
const { adminLimiter } = require('../middleware/rateLimiter');

// All admin routes require authentication and admin role
router.use(supabaseAuthMiddleware);
router.use(roleMiddleware('admin'));
router.use(adminLimiter);

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Lawyer verification
router.get('/lawyers/pending', validate(pendingLawyers), adminController.getPendingLawyers);
router.put('/lawyers/:lawyer_id/verify', validate(verifyLawyer), adminController.verifyLawyer);

// User management
router.get('/users', validate(listUsers), adminController.listUsers);
router.get('/users/:user_id', validate(getUserDetails), adminController.getUserDetails);
router.put('/users/:user_id/ban', validate(toggleUserBan), adminController.toggleUserBan);

// Consultations
router.get('/consultations', validate(listConsultations), adminController.listConsultations);

// Revenue analytics
router.get('/revenue', validate(revenueAnalytics), adminController.getRevenueAnalytics);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/audit-logs/stats', adminController.getAuditStats);
router.get('/audit-logs/user/:user_id', adminController.getUserAuditLogs);
router.get('/audit-logs/entity/:entity_type/:entity_id', adminController.getEntityAuditLogs);

module.exports = router;
