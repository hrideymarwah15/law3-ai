const { z } = require('zod');
const { email, phone, simplePassword, otp, language, sanitizedString } = require('./common.validators');

const signupSchema = {
  body: z.object({
    email: email.optional(),
    phone: phone.optional(),
    password: simplePassword,
    name: sanitizedString(100, 2),
    signup_method: z.enum(['email', 'phone']),
  }).refine(
    (data) => {
      if (data.signup_method === 'email') return !!data.email;
      if (data.signup_method === 'phone') return !!data.phone;
      return false;
    },
    { message: 'Email or phone required based on signup method' }
  ),
};

const signinSchema = {
  body: z.object({
    email: email.optional(),
    phone: phone.optional(),
    password: simplePassword,
  }).refine(
    (data) => data.email || data.phone,
    { message: 'Email or phone is required' }
  ),
};

const signinOtpSchema = {
  body: z.object({
    phone: phone,
  }),
};

const verifyOtpSchema = {
  body: z.object({
    phone: phone,
    token: otp,
  }),
};

const oauthSchema = {
  body: z.object({
    provider: z.enum(['google']),
    redirect_url: z.string().url('Invalid redirect URL'),
  }),
};

const forgotPasswordSchema = {
  body: z.object({
    email: email,
  }),
};

const resetPasswordSchema = {
  body: z.object({
    new_password: simplePassword,
  }),
};

const completeProfileSchema = {
  body: z.object({
    name: sanitizedString(100, 2).optional(),
    city: sanitizedString(50).optional(),
    language_preference: language.optional(),
  }),
};

const refreshTokenSchema = {
  body: z.object({
    refresh_token: z.string().min(1, 'Refresh token is required'),
  }),
};

module.exports = {
  signupSchema,
  signinSchema,
  signinOtpSchema,
  verifyOtpSchema,
  oauthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeProfileSchema,
  refreshTokenSchema,
};
