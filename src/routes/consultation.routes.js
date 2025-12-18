const express = require('express');
const router = express.Router();

const consultationController = require('../controllers/consultation.controller');
const { supabaseAuthMiddleware, roleMiddleware, verifiedLawyerMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');

const {
  bookConsultationSchema,
  confirmPaymentSchema,
  getConsultationsSchema,
  cancelConsultationSchema,
  completeConsultationSchema,
} = require('../validators/consultation.validators');

// All routes require authentication
router.use(supabaseAuthMiddleware);

router.post(
  '/book',
  validate(bookConsultationSchema),
  asyncHandler(consultationController.book)
);

router.post(
  '/:consultation_id/confirm-payment',
  validate(confirmPaymentSchema),
  asyncHandler(consultationController.confirmPayment)
);

router.get(
  '/my-consultations',
  validate(getConsultationsSchema),
  asyncHandler(consultationController.getMyConsultations)
);

router.put(
  '/:consultation_id/cancel',
  validate(cancelConsultationSchema),
  asyncHandler(consultationController.cancel)
);

// Only verified lawyers can complete consultations
router.put(
  '/:consultation_id/complete',
  roleMiddleware('lawyer', 'admin'),
  verifiedLawyerMiddleware,
  validate(completeConsultationSchema),
  asyncHandler(consultationController.complete)
);

module.exports = router;
