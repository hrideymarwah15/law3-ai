const express = require('express');
const router = express.Router();

const lawyerController = require('../controllers/lawyer.controller');
const { supabaseAuthMiddleware, optionalAuthMiddleware, roleMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { rateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

const {
  searchLawyersSchema,
  getLawyerSchema,
  getAvailabilitySchema,
  updateAvailabilitySchema,
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

// Protected routes (for lawyers)
router.post(
  '/availability',
  supabaseAuthMiddleware,
  roleMiddleware('lawyer', 'admin'),
  validate(updateAvailabilitySchema),
  asyncHandler(lawyerController.setAvailability)
);

module.exports = router;
