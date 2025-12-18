const { supabase, supabaseAdmin } = require('../config/supabase');
const { UnauthorizedError, ValidationError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const otpService = require('../services/otp.service');
const { auditService, AuditActions } = require('../services/audit.service');

class AuthController {
  /**
   * POST /auth/signup
   * Register a new user with email/phone and password
   */
  async signup(req, res, next) {
    try {
      const { email, phone, password, name, first_name, last_name, signup_method } = req.body;

      // Support both legacy 'name' field and new first_name/last_name
      let finalFirstName = first_name;
      let finalLastName = last_name;
      
      if (!first_name && name) {
        // Split legacy name into first_name/last_name
        const nameParts = name.trim().split(/\s+/);
        finalFirstName = nameParts[0];
        finalLastName = nameParts.slice(1).join(' ') || null;
      }

      const signupData = {
        password,
        options: {
          data: { first_name: finalFirstName, last_name: finalLastName },
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

      // Log audit event
      await auditService.log({
        action: AuditActions.USER_LOGIN,
        userId: data.user.id,
        entityType: 'user',
        entityId: data.user.id,
        newData: { email, phone, method: 'password' },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

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
          first_name: profile?.first_name,
          last_name: profile?.last_name,
          display_name: profile?.display_name,
          is_verified: profile?.is_verified || profile?.is_email_verified || profile?.is_phone_verified,
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
      const { phone, purpose = 'login' } = req.body;

      // Use our custom OTP service with database storage
      const result = await otpService.sendOtp(phone, purpose);

      if (!result.success) {
        return res.status(429).json({
          success: false,
          error: result.error,
          wait_seconds: result.wait_seconds,
        });
      }

      logger.info({ message: 'OTP sent', phone: phone.slice(-4), purpose });

      res.json({
        success: true,
        message: 'OTP sent to your phone',
        expires_in_minutes: result.expires_in_minutes,
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
      const { phone, token, purpose = 'login' } = req.body;

      // Verify OTP using our custom service
      const otpResult = await otpService.verifyOtp(phone, token, purpose);

      if (!otpResult.success) {
        return res.status(400).json({
          success: false,
          error: otpResult.error,
          remaining_attempts: otpResult.remaining_attempts,
        });
      }

      // OTP verified - now sign in or create user via Supabase
      // First check if user exists
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      let user;
      let isNewUser = false;

      if (existingUser) {
        user = existingUser;
      } else {
        // Create new user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          phone,
          phone_confirm: true,
        });

        if (authError) {
          logger.error({ message: 'Failed to create user', error: authError.message });
          throw new ValidationError('Failed to create account');
        }

        // Fetch the created user profile
        const { data: newUser } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        user = newUser || { id: authData.user.id, phone };
        isNewUser = true;
      }

      // Generate session
      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        phone,
      });

      // Create a session token using admin API
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        phone,
        password: process.env.OTP_FALLBACK_PASSWORD || 'temp-session',
      }).catch(() => ({ data: null, error: 'Password auth not configured' }));

      // Log audit event
      await auditService.log({
        action: isNewUser ? AuditActions.USER_SIGNUP : AuditActions.USER_LOGIN,
        userId: user.id,
        entityType: 'user',
        entityId: user.id,
        newData: { phone, method: 'otp', purpose },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      logger.info({ message: 'OTP verified and user authenticated', userId: user.id });

      res.json({
        success: true,
        message: isNewUser ? 'Account created successfully' : 'Login successful',
        user: {
          id: user.id,
          phone: user.phone,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name,
          role: user.role || 'user',
          is_new: isNewUser || !user.first_name,
        },
        // Note: In production, implement proper session management
        // This may require additional token generation logic
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
      // Log audit event before signout
      await auditService.log({
        action: AuditActions.USER_LOGOUT,
        userId: req.user?.id,
        entityType: 'user',
        entityId: req.user?.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

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
          first_name: req.user.first_name,
          last_name: req.user.last_name,
          display_name: req.user.display_name,
          role: req.user.role,
          status: req.user.status,
          city: req.user.city,
          state: req.user.state,
          preferred_language: req.user.preferred_language,
          is_email_verified: req.user.is_email_verified,
          is_phone_verified: req.user.is_phone_verified,
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
      const { first_name, last_name, city, state, preferred_language } = req.body;

      const updateData = {};
      if (first_name) updateData.first_name = first_name;
      if (last_name) updateData.last_name = last_name;
      if (city) updateData.city = city;
      if (state) updateData.state = state;
      if (preferred_language) updateData.preferred_language = preferred_language;
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
