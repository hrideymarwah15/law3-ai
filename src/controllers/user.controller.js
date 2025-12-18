const { supabaseAdmin } = require('../config/supabase');
const { ValidationError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

class UserController {
  /**
   * GET /user/profile
   * Get current user profile
   */
  async getProfile(req, res, next) {
    try {
      res.json({
        success: true,
        user: {
          id: req.user.id,
          phone: req.user.phone,
          email: req.user.email,
          name: req.user.name,
          city: req.user.city,
          language_preference: req.user.language_preference,
          avatar_url: req.user.avatar_url,
          role: req.user.role,
          is_verified: req.user.is_verified,
          created_at: req.user.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /user/profile
   * Update user profile
   */
  async updateProfile(req, res, next) {
    try {
      const { name, email, city, language_preference } = req.body;
      const userId = req.user.id;

      const updateData = { updated_at: new Date().toISOString() };
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (city !== undefined) updateData.city = city;
      if (language_preference !== undefined) updateData.language_preference = language_preference;

      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new ValidationError(error.message);
      }

      logger.info({ message: 'Profile updated', userId });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /user/change-password
   * Change user password
   */
  async changePassword(req, res, next) {
    try {
      const { current_password, new_password } = req.body;

      // Verify current password by re-authenticating
      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: req.user.email,
        password: current_password,
      });

      if (signInError) {
        throw new ValidationError('Current password is incorrect');
      }

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        req.user.id,
        { password: new_password }
      );

      if (updateError) {
        throw new ValidationError(updateError.message);
      }

      logger.info({ message: 'Password changed', userId: req.user.id });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
