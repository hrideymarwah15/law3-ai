const express = require('express');
const router = express.Router();
const caseController = require('../controllers/case.controller');
const { supabaseAuthMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createCase,
  updateCase,
  getCaseById,
  listCases,
} = require('../validators/case.validators');
const { generalLimiter } = require('../middleware/rateLimiter');

// All case routes require authentication
router.use(supabaseAuthMiddleware);
router.use(generalLimiter);

// Create a new case
router.post('/create', validate(createCase), caseController.create);

// Get all cases for the logged-in user
router.get('/my-cases', validate(listCases), caseController.getMyCases);

// Get a specific case by ID
router.get('/:case_id', validate(getCaseById), caseController.getById);

// Update a case
router.put('/:case_id', validate(updateCase), caseController.update);

// Delete a case
router.delete('/:case_id', validate(getCaseById), caseController.delete);

module.exports = router;
