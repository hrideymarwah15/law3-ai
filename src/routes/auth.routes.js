const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { supabaseAuthMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { rateLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

const {
  signupSchema,
  signinSchema,
  signinOtpSchema,
  verifyOtpSchema,
  oauthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeProfileSchema,
  refreshTokenSchema,
} = require('../validators/auth.validators');

// Public routes with rate limiting
router.post(
  '/signup',
  rateLimiter.auth,
  validate(signupSchema),
  asyncHandler(authController.signup)
);

router.post(
  '/signin',
  rateLimiter.auth,
  validate(signinSchema),
  asyncHandler(authController.signin)
);

router.post(
  '/signin/otp',
  rateLimiter.otp,
  validate(signinOtpSchema),
  asyncHandler(authController.signinOtp)
);

router.post(
  '/verify-otp',
  rateLimiter.auth,
  validate(verifyOtpSchema),
  asyncHandler(authController.verifyOtp)
);

router.post(
  '/signin/oauth',
  rateLimiter.auth,
  validate(oauthSchema),
  asyncHandler(authController.signinOauth)
);

router.post(
  '/forgot-password',
  rateLimiter.auth,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);

router.post(
  '/resend-verification',
  rateLimiter.auth,
  asyncHandler(authController.resendVerification)
);

router.post(
  '/refresh',
  validate(refreshTokenSchema),
  asyncHandler(authController.refresh)
);

// Sync profile - creates profile if user exists in auth but not in public.users
// Does NOT require supabaseAuthMiddleware since profile may not exist
router.post(
  '/sync-profile',
  rateLimiter.auth,
  asyncHandler(authController.syncProfile)
);

// Protected routes
router.get(
  '/me',
  supabaseAuthMiddleware,
  asyncHandler(authController.getMe)
);

router.post(
  '/signout',
  supabaseAuthMiddleware,
  asyncHandler(authController.signout)
);

router.post(
  '/reset-password',
  supabaseAuthMiddleware,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);

router.post(
  '/complete-profile',
  supabaseAuthMiddleware,
  validate(completeProfileSchema),
  asyncHandler(authController.completeProfile)
);

module.exports = router;
