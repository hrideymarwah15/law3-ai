const express = require('express');
const router = express.Router();
const { z } = require('zod');

const chatbotController = require('../controllers/chatbot.controller');
const { optionalAuthMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { rateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const { language, caseType, sanitizedText } = require('../validators/common.validators');

const querySchema = {
  body: z.object({
    query: sanitizedText(5000).min(1, 'Query is required'),
    language: language,
    session_id: z.string().min(1, 'Session ID is required'),
  }),
};

const costEstimateSchema = {
  body: z.object({
    case_type: caseType,
    city: z.string().min(1).max(50),
  }),
};

const historySchema = {
  query: z.object({
    session_id: z.string().min(1),
  }),
};

// All routes have optional auth (works for anonymous users)
router.use(optionalAuthMiddleware);

router.post(
  '/query',
  rateLimiter.chatbot,
  validate(querySchema),
  asyncHandler(chatbotController.query)
);

router.post(
  '/cost-estimate',
  validate(costEstimateSchema),
  asyncHandler(chatbotController.costEstimate)
);

router.get(
  '/history',
  validate(historySchema),
  asyncHandler(chatbotController.getHistory)
);

module.exports = router;
