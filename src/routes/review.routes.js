const express = require('express');
const router = express.Router();
const { z } = require('zod');

const reviewController = require('../controllers/review.controller');
const { supabaseAuthMiddleware, optionalAuthMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { uuid, pagination, sanitizedText } = require('../validators/common.validators');

const createReviewSchema = {
  body: z.object({
    consultation_id: uuid,
    rating: z.number().int().min(1).max(5),
    review_text: sanitizedText(200).optional(),
  }),
};

const getByLawyerSchema = {
  params: z.object({
    lawyer_id: uuid,
  }),
  query: pagination,
};

// Public route for viewing reviews
router.get(
  '/lawyer/:lawyer_id',
  optionalAuthMiddleware,
  validate(getByLawyerSchema),
  asyncHandler(reviewController.getByLawyer)
);

// Protected route for creating reviews
router.post(
  '/create',
  supabaseAuthMiddleware,
  validate(createReviewSchema),
  asyncHandler(reviewController.create)
);

module.exports = router;
