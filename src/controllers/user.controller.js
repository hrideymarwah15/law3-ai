/**
 * User Controller
 * 
 * Handles HTTP requests for user-related operations.
 * Delegates business logic to UserService.
 * 
 * Pattern: Thin Controller → Service → Repository
 */

const { supabaseAdmin } = require('../config/supabase');
const { ValidationError, UnauthorizedError } = require('../middleware/errorHandler');
const { asyncHandler } = require('../utils/asyncHandler');
const { services } = require('../services');
const logger = require('../config/logger');
const { convertUserExportToCSV } = require('../utils/csv.utils');

class UserController {
  constructor() {
    // Bind methods to preserve 'this' context when used as route handlers
    this.getProfile = this.getProfile.bind(this);
    this.getProfileById = this.getProfileById.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.changePassword = this.changePassword.bind(this);
    this.deleteAccount = this.deleteAccount.bind(this);
    this.getNotificationPreferences = this.getNotificationPreferences.bind(this);
    this.updateNotificationPreferences = this.updateNotificationPreferences.bind(this);
    this.requestDataExport = this.requestDataExport.bind(this);
  }

  /**
   * Get service instance (lazy loaded)
   * @private
   */
  get userService() {
    return services.userService;
  }

  /**
   * GET /user/profile
   * Get current user's profile
   */
  getProfile = asyncHandler(async (req, res) => {
    const user = await this.userService.getUserById(req.user.id, {
      includeProfile: true,
    });

    res.success({
      user: this._formatUserResponse(user),
    });
  });

  /**
   * GET /user/profile/:id
   * Get user profile by ID (admin or self only)
   */
  getProfileById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const requesterId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Only allow access to own profile or admin access
    if (id !== requesterId && !isAdmin) {
      throw new UnauthorizedError('You can only view your own profile');
    }

    const user = await this.userService.getUserById(id, {
      includeProfile: true,
    });

    res.success({
      user: this._formatUserResponse(user),
    });
  });

  /**
   * PUT /user/profile
   * Update current user's profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, email, city, language_preference, phone, avatar_url } = req.body;

    // Validate email uniqueness if changing
    if (email && email !== req.user.email) {
      const isAvailable = await this.userService.isEmailAvailable(email, userId);
      if (!isAvailable) {
        throw new ValidationError('Email is already in use');
      }
    }

    // Validate phone uniqueness if changing
    if (phone && phone !== req.user.phone) {
      const isAvailable = await this.userService.isPhoneAvailable(phone, userId);
      if (!isAvailable) {
        throw new ValidationError('Phone number is already in use');
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.first_name = name.split(' ')[0];
    if (name !== undefined && name.split(' ').length > 1) {
      updateData.last_name = name.split(' ').slice(1).join(' ');
    }
    if (email !== undefined) updateData.email = email;
    if (city !== undefined) updateData.city = city;
    if (language_preference !== undefined) {
      updateData.preferred_language = language_preference;
    }
    if (phone !== undefined) updateData.phone = phone;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const updated = await this.userService.updateProfile(userId, updateData);

    logger.info({ 
      message: 'Profile updated', 
      userId, 
      fields: Object.keys(updateData),
    });

    res.success({
      message: 'Profile updated successfully',
      user: this._formatUserResponse(updated),
    });
  });

  /**
   * PUT /user/change-password
   * Change current user's password
   */
  changePassword = asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    // Validate password requirements
    if (!new_password || new_password.length < 8) {
      throw new ValidationError('New password must be at least 8 characters');
    }

    if (!/[A-Z]/.test(new_password) || !/[a-z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      throw new ValidationError(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      );
    }

    // Verify current password by re-authenticating using the public supabase client
    const { supabase } = require('../config/supabase');
    
    // Need email to verify password
    if (!req.user.email) {
      throw new ValidationError('Password change requires an email-based account');
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: current_password,
    });

    if (signInError) {
      logger.warn({ 
        message: 'Failed password change - incorrect current password', 
        userId,
      });
      throw new ValidationError('Current password is incorrect');
    }

    // Update password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: new_password }
    );

    if (updateError) {
      throw new ValidationError(updateError.message);
    }

    logger.info({ message: 'Password changed', userId });

    res.success({
      message: 'Password changed successfully',
    });
  });

  /**
   * DELETE /user/account
   * Delete current user's account (soft delete)
   */
  deleteAccount = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { reason, confirmation } = req.body;

    // Require explicit confirmation
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      throw new ValidationError(
        'Please confirm account deletion by sending confirmation: "DELETE_MY_ACCOUNT"'
      );
    }

    await this.userService.deleteAccount(userId, reason || 'User requested');

    logger.info({ 
      message: 'Account deleted', 
      userId, 
      reason: reason || 'User requested',
    });

    res.success({
      message: 'Account has been scheduled for deletion',
    });
  });

  /**
   * GET /user/notifications/preferences
   * Get notification preferences
   */
  getNotificationPreferences = asyncHandler(async (req, res) => {
    const user = await this.userService.getUserById(req.user.id);

    res.success({
      preferences: user.notification_preferences || {
        email: true,
        sms: true,
        push: true,
        marketing: false,
        consultation_reminders: true,
        case_updates: true,
      },
    });
  });

  /**
   * PUT /user/notifications/preferences
   * Update notification preferences
   */
  updateNotificationPreferences = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const preferences = req.body;

    // Validate preference structure
    const validKeys = ['email', 'sms', 'push', 'marketing', 'consultation_reminders', 'case_updates'];
    const filteredPreferences = {};
    
    for (const key of validKeys) {
      if (typeof preferences[key] === 'boolean') {
        filteredPreferences[key] = preferences[key];
      }
    }

    await this.userService.updateProfile(userId, {
      notification_preferences: filteredPreferences,
    });

    logger.info({ 
      message: 'Notification preferences updated', 
      userId,
    });

    res.success({
      message: 'Notification preferences updated',
      preferences: filteredPreferences,
    });
  });

  /**
   * POST /user/data-export
   * Request user data export (GDPR compliance)
   */
  requestDataExport = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { format = 'json', include = ['profile', 'consultations', 'payments'] } = req.body;

    const exportData = {};

    // Profile data
    if (include.includes('profile')) {
      const user = await this.userService.getUserById(userId, { includeProfile: true });
      exportData.profile = this._formatUserResponse(user);
    }

    // Consultations
    if (include.includes('consultations')) {
      const { data: consultations } = await supabaseAdmin
        .from('consultations')
        .select(`
          id,
          reference_number,
          booking_date,
          booking_time,
          status,
          consultation_type,
          amount,
          problem_description,
          notes,
          created_at,
          lawyers:lawyer_id(
            specialization,
            users:user_id(display_name)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      exportData.consultations = consultations?.map(c => ({
        reference: c.reference_number,
        date: c.booking_date,
        time: c.booking_time,
        status: c.status,
        type: c.consultation_type,
        amount: c.amount,
        lawyer: c.lawyers?.users?.display_name,
        specialization: c.lawyers?.specialization,
        problem: c.problem_description,
        notes: c.notes,
        created_at: c.created_at,
      })) || [];
    }

    // Payments
    if (include.includes('payments')) {
      const { data: payments } = await supabaseAdmin
        .from('payments')
        .select('payment_reference, amount, status, payment_method, paid_at, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      exportData.payments = payments || [];
    }

    // Cases
    if (include.includes('cases')) {
      const { data: cases } = await supabaseAdmin
        .from('cases')
        .select('case_title, case_number, case_type, status, court_name, next_hearing_date, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      exportData.cases = cases || [];
    }

    // Reviews
    if (include.includes('reviews')) {
      const { data: reviews } = await supabaseAdmin
        .from('reviews')
        .select('rating, review_text, created_at, lawyers:lawyer_id(users:user_id(display_name))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      exportData.reviews = reviews?.map(r => ({
        rating: r.rating,
        review: r.review_text,
        lawyer: r.lawyers?.users?.display_name,
        created_at: r.created_at,
      })) || [];
    }

    // Notifications
    if (include.includes('notifications')) {
      const { data: notifications } = await supabaseAdmin
        .from('notifications')
        .select('title, body, notification_type, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      exportData.notifications = notifications || [];
    }

    // Chat history
    if (include.includes('chat_history')) {
      const { data: messages } = await supabaseAdmin
        .from('chat_messages')
        .select('content, message_type, created_at, chat_rooms:room_id(id)')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(500);
      
      exportData.chat_history = messages?.map(m => ({
        content: m.content,
        type: m.message_type,
        room_id: m.chat_rooms?.id,
        sent_at: m.created_at,
      })) || [];
    }

    // Add export metadata
    exportData.export_info = {
      user_id: userId,
      exported_at: new Date().toISOString(),
      format,
      includes: include,
    };

    logger.info({
      message: 'Data export requested',
      userId,
      format,
      includes: include,
    });

    // Handle CSV format export
    if (format === 'csv') {
      const csvResult = convertUserExportToCSV(exportData);
      
      // Set proper headers for CSV download
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `nyaay-saathi-export-${timestamp}.csv`;
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('X-Export-Files-Count', csvResult.files.length);
      
      logger.info({
        message: 'CSV export generated',
        userId,
        filesCount: csvResult.files.length,
        totalSize: csvResult.combined.length,
      });
      
      return res.send(csvResult.combined);
    }
    
    // JSON format export
    res.success({
      message: 'Data export generated successfully',
      data: exportData,
      format: 'json',
    });
  });

  /**
   * Format user data for API response
   * @private
   */
  _formatUserResponse(user) {
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.first_name 
        ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
        : user.name,
      first_name: user.first_name,
      last_name: user.last_name,
      city: user.city,
      state: user.state,
      language_preference: user.preferred_language || user.language_preference,
      avatar_url: user.avatar_url,
      role: user.role,
      is_verified: user.is_verified,
      is_banned: user.is_banned,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
}

module.exports = new UserController();
