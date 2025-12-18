const express = require('express');
const router = express.Router();

const lawyerController = require('../controllers/lawyer.controller');
const lawyerRegistrationController = require('../controllers/lawyer-registration.controller');
const { supabaseAuthMiddleware, optionalAuthMiddleware, roleMiddleware, verifiedLawyerMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { rateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

const {
  searchLawyersSchema,
  getLawyerSchema,
  getAvailabilitySchema,
  updateAvailabilitySchema,
  lawyerRegistrationSchema,
  updateRegistrationSchema,
  selfUpdateProfileSchema,
  bulkAvailabilitySchema,
  setUnavailabilitySchema,
  getMyLawyerConsultationsSchema,
} = require('../validators/lawyer.validators');

// Public routes
router.get(
  '/search',
  rateLimiter.search,
  optionalAuthMiddleware,
  validate(searchLawyersSchema),
  asyncHandler(lawyerController.search)
);

router.get(
  '/:lawyer_id',
  optionalAuthMiddleware,
  validate(getLawyerSchema),
  asyncHandler(lawyerController.getProfile)
);

router.get(
  '/:lawyer_id/availability',
  optionalAuthMiddleware,
  validate(getAvailabilitySchema),
  asyncHandler(lawyerController.getAvailability)
);

// Protected routes (for verified lawyers only)
router.post(
  '/availability',
  supabaseAuthMiddleware,
  roleMiddleware('lawyer', 'admin'),
  verifiedLawyerMiddleware,
  validate(updateAvailabilitySchema),
  asyncHandler(lawyerController.setAvailability)
);

// ============================================
// LAWYER SELF-REGISTRATION ROUTES
// ============================================

/**
 * @route POST /api/v1/lawyers/register
 * @desc Submit lawyer registration request
 * @access Private (any authenticated user)
 */
router.post(
  '/register',
  supabaseAuthMiddleware,
  validate(lawyerRegistrationSchema),
  asyncHandler(lawyerRegistrationController.submitRegistration)
);

/**
 * @route GET /api/v1/lawyers/registration-status
 * @desc Get current registration request status
 * @access Private
 */
router.get(
  '/registration-status',
  supabaseAuthMiddleware,
  asyncHandler(lawyerRegistrationController.getRegistrationStatus)
);

/**
 * @route PUT /api/v1/lawyers/registration
 * @desc Update registration request (resubmit after changes requested)
 * @access Private
 */
router.put(
  '/registration',
  supabaseAuthMiddleware,
  validate(updateRegistrationSchema),
  asyncHandler(lawyerRegistrationController.updateRegistration)
);

/**
 * @route DELETE /api/v1/lawyers/registration
 * @desc Withdraw registration request
 * @access Private
 */
router.delete(
  '/registration',
  supabaseAuthMiddleware,
  asyncHandler(lawyerRegistrationController.withdrawRegistration)
);

// ============================================
// LAWYER SELF-SERVICE ROUTES (Verified Lawyers Only)
// ============================================

/**
 * @route GET /api/v1/lawyers/me
 * @desc Get own lawyer profile
 * @access Verified Lawyer
 */
router.get(
  '/me',
  supabaseAuthMiddleware,
  roleMiddleware('lawyer'),
  verifiedLawyerMiddleware,
  asyncHandler(lawyerRegistrationController.getMyProfile)
);

/**
 * @route PUT /api/v1/lawyers/me
 * @desc Update own lawyer profile
 * @access Verified Lawyer
 */
router.put(
  '/me',
  supabaseAuthMiddleware,
  roleMiddleware('lawyer'),
  verifiedLawyerMiddleware,
  validate(selfUpdateProfileSchema),
  asyncHandler(lawyerRegistrationController.updateMyProfile)
);

/**
 * @route GET /api/v1/lawyers/me/dashboard
 * @desc Get lawyer dashboard with stats
 * @access Verified Lawyer
 */
router.get(
  '/me/dashboard',
  supabaseAuthMiddleware,
  roleMiddleware('lawyer'),
  verifiedLawyerMiddleware,
  asyncHandler(lawyerRegistrationController.getDashboard)
);

/**
 * @route GET /api/v1/lawyers/me/consultations
 * @desc Get lawyer's consultations
 * @access Verified Lawyer
 */
router.get(
  '/me/consultations',
  supabaseAuthMiddleware,
  roleMiddleware('lawyer'),
  verifiedLawyerMiddleware,
  validate(getMyLawyerConsultationsSchema),
  asyncHandler(lawyerRegistrationController.getMyConsultations)
);

/**
 * @route PUT /api/v1/lawyers/me/availability/bulk
 * @desc Set availability for multiple days
 * @access Verified Lawyer
 */
router.put(
  '/me/availability/bulk',
  supabaseAuthMiddleware,
  roleMiddleware('lawyer'),
  verifiedLawyerMiddleware,
  validate(bulkAvailabilitySchema),
  asyncHandler(lawyerRegistrationController.setBulkAvailability)
);

/**
 * @route POST /api/v1/lawyers/me/unavailability
 * @desc Set unavailability dates (vacation, holidays)
 * @access Verified Lawyer
 */
router.post(
  '/me/unavailability',
  supabaseAuthMiddleware,
  roleMiddleware('lawyer'),
  verifiedLawyerMiddleware,
  validate(setUnavailabilitySchema),
  asyncHandler(lawyerRegistrationController.setUnavailability)
);

module.exports = router;
