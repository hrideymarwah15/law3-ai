const { supabase, supabaseAdmin } = require('../config/supabase');
const { UnauthorizedError, ValidationError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

class AuthController {
  /**
   * POST /auth/signup
   * Register a new user with email/phone and password
   */
  async signup(req, res, next) {
    try {
      const { email, phone, password, name, signup_method } = req.body;

      const signupData = {
        password,
        options: {
          data: { name },
        },
      };

      if (signup_method === 'email') {
        signupData.email = email;
      } else {
        signupData.phone = phone;
      }

      const { data, error } = await supabase.auth.signUp(signupData);

      if (error) {
        logger.warn({ message: 'Signup error', error: error.message, email, phone });
        if (error.message.includes('already registered')) {
          throw new ConflictError('User already exists with this email or phone');
        }
        throw new ValidationError(error.message);
      }

      logger.info({ 
        message: 'User signed up', 
        userId: data.user?.id, 
        method: signup_method 
      });

      res.status(201).json({
        success: true,
        message: signup_method === 'email' 
          ? 'Verification email sent. Please check your inbox.' 
          : 'OTP sent to your phone.',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          phone: data.user?.phone,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/signin
   * Sign in with email/phone and password
   */
  async signin(req, res, next) {
    try {
      const { email, phone, password } = req.body;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        phone,
        password,
      });

      if (error) {
        logger.warn({ message: 'Signin error', error: error.message, email, phone });
        throw new UnauthorizedError('Invalid credentials');
      }

      // Fetch user profile
      const { data: profile } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      logger.info({ message: 'User signed in', userId: data.user.id });

      res.json({
        success: true,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
        user: {
          id: data.user.id,
          email: data.user.email,
          phone: data.user.phone,
          role: profile?.role || 'user',
          name: profile?.name,
          is_verified: profile?.is_verified,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/signin/otp
   * Send OTP to phone for passwordless signin
   */
  async signinOtp(req, res, next) {
    try {
      const { phone } = req.body;

      const { error } = await supabase.auth.signInWithOtp({ phone });

      if (error) {
        logger.warn({ message: 'OTP send error', error: error.message, phone });
        throw new ValidationError(error.message);
      }

      logger.info({ message: 'OTP sent', phone: phone.slice(-4) });

      res.json({
        success: true,
        message: 'OTP sent to your phone',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/verify-otp
   * Verify phone OTP and complete sign in
   */
  async verifyOtp(req, res, next) {
    try {
      const { phone, token } = req.body;

      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });

      if (error) {
        logger.warn({ message: 'OTP verify error', error: error.message });
        throw new UnauthorizedError('Invalid or expired OTP');
      }

      // Fetch or create user profile
      let { data: profile } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      logger.info({ message: 'OTP verified', userId: data.user.id });

      res.json({
        success: true,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        },
        user: {
          id: data.user.id,
          phone: data.user.phone,
          role: profile?.role || 'user',
          name: profile?.name,
          is_new: !profile?.name,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/signin/oauth
   * Initiate OAuth sign in (Google)
   */
  async signinOauth(req, res, next) {
    try {
      const { provider, redirect_url } = req.body;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirect_url,
        },
      });

      if (error) {
        throw new ValidationError(error.message);
      }

      res.json({
        success: true,
        url: data.url,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/signout
   * Sign out current user
   */
  async signout(req, res, next) {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        logger.warn({ message: 'Signout error', error: error.message });
      }

      logger.info({ message: 'User signed out', userId: req.user?.id });

      res.json({
        success: true,
        message: 'Signed out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  async refresh(req, res, next) {
    try {
      const { refresh_token } = req.body;

      const { data, error } = await supabase.auth.refreshSession({ 
        refresh_token 
      });

      if (error) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      res.json({
        success: true,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  async getMe(req, res, next) {
    try {
      res.json({
        success: true,
        user: {
          id: req.user.id,
          email: req.user.email,
          phone: req.user.phone,
          name: req.user.name,
          role: req.user.role,
          city: req.user.city,
          language_preference: req.user.language_preference,
          is_verified: req.user.is_verified,
          avatar_url: req.user.avatar_url,
          created_at: req.user.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/forgot-password
   * Send password reset email
   */
  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
      });

      if (error) {
        logger.warn({ message: 'Password reset error', error: error.message });
      }

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/reset-password
   * Reset password with token
   */
  async resetPassword(req, res, next) {
    try {
      const { new_password } = req.body;

      const { error } = await supabase.auth.updateUser({
        password: new_password,
      });

      if (error) {
        throw new ValidationError(error.message);
      }

      logger.info({ message: 'Password reset successful', userId: req.user?.id });

      res.json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/complete-profile
   * Complete user profile after signup
   */
  async completeProfile(req, res, next) {
    try {
      const { name, city, language_preference } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (city) updateData.city = city;
      if (language_preference) updateData.language_preference = language_preference;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', req.user.id)
        .select()
        .single();

      if (error) {
        throw new ValidationError(error.message);
      }

      logger.info({ message: 'Profile completed', userId: req.user.id });

      res.json({
        success: true,
        message: 'Profile completed',
        user: data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
