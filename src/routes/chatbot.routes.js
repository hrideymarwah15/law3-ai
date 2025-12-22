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
    query: sanitizedText(5000, 1),
    language: language,
    session_id: z.string().min(1, 'Session ID is required'),
    city: z.string().min(1).max(50).optional().nullable(),
  }),
};

const costEstimateSchema = {
  body: z.object({
    case_type: caseType,
    city: z.string().min(1).max(50),
  }),
};

const historySchema = {
  params: z.object({
    session_id: z.string().min(1),
  }),
};

const lawyersByDomainSchema = {
  params: z.object({
    domain: z.string().min(1).max(50),
  }),
  query: z.object({
    city: z.string().min(1).max(50).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    min_rating: z.string().regex(/^\d+(\.\d+)?$/).optional(),
    max_fee: z.string().regex(/^\d+$/).optional(),
    language: z.enum(['english', 'hindi']).optional(),
  }),
};

const domainsSchema = {
  query: z.object({
    language: z.enum(['english', 'hindi']).optional(),
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
  '/history/:session_id',
  validate(historySchema),
  asyncHandler(chatbotController.getHistory)
);

router.get(
  '/domains',
  validate(domainsSchema),
  asyncHandler(chatbotController.getDomains)
);

router.get(
  '/lawyers/:domain',
  validate(lawyersByDomainSchema),
  asyncHandler(chatbotController.getLawyersByDomain)
);

module.exports = router;
