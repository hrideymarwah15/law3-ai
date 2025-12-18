const express = require('express');
const router = express.Router();
const { z } = require('zod');

const userController = require('../controllers/user.controller');
const { supabaseAuthMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { email, language, sanitizedString, simplePassword } = require('../validators/common.validators');

const updateProfileSchema = {
  body: z.object({
    name: sanitizedString(100, 2).optional(),
    email: email.optional(),
    city: sanitizedString(50).optional(),
    language_preference: language.optional(),
  }),
};

const changePasswordSchema = {
  body: z.object({
    current_password: simplePassword,
    new_password: simplePassword,
  }),
};

// All routes require authentication
router.use(supabaseAuthMiddleware);

router.get(
  '/profile',
  asyncHandler(userController.getProfile)
);

router.put(
  '/profile',
  validate(updateProfileSchema),
  asyncHandler(userController.updateProfile)
);

router.put(
  '/change-password',
  validate(changePasswordSchema),
  asyncHandler(userController.changePassword)
);

module.exports = router;
