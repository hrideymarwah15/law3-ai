/**
 * Lawyer Registration Controller
 * Handles lawyer self-registration and profile management
 * 
 * Flow:
 * 1. User submits registration request with documents
 * 2. Admin reviews and approves/rejects
 * 3. On approval, lawyer profile is created automatically
 * 4. Lawyer can then update their profile and set availability
 */

const { supabaseAdmin } = require('../config/supabase');
const { cache } = require('../config/redis');
const {
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
} = require('../middleware/errorHandler');
const logger = require('../config/logger');

class LawyerRegistrationController {
  /**
   * POST /lawyers/register
   * Submit lawyer registration request
   */
  async submitRegistration(req, res, next) {
    try {
      const userId = req.user.id;
      const registrationData = req.body;

      // Check if user already has a lawyer profile
      const { data: existingLawyer } = await supabaseAdmin
        .from('lawyers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingLawyer) {
        throw new ConflictError('You already have a lawyer profile');
      }

      // Check for pending registration request
      const { data: existingRequest } = await supabaseAdmin
        .from('lawyer_registration_requests')
        .select('id, status')
        .eq('user_id', userId)
        .single();

      if (existingRequest) {
        if (existingRequest.status === 'pending' || existingRequest.status === 'under_review') {
          throw new ConflictError('You already have a pending registration request');
        }
        if (existingRequest.status === 'approved') {
          throw new ConflictError('Your registration has already been approved');
        }
      }

      // Check bar council number uniqueness
      const { data: existingBarCouncil } = await supabaseAdmin
        .from('lawyers')
        .select('id')
        .eq('bar_council_number', registrationData.bar_council_number)
        .eq('bar_council_state', registrationData.bar_council_state)
        .single();

      if (existingBarCouncil) {
        throw new ConflictError('This bar council number is already registered');
      }

      // Also check in registration requests
      const { data: pendingBarCouncil } = await supabaseAdmin
        .from('lawyer_registration_requests')
        .select('id')
        .eq('bar_council_number', registrationData.bar_council_number)
        .eq('bar_council_state', registrationData.bar_council_state)
        .in('status', ['pending', 'under_review'])
        .single();

      if (pendingBarCouncil) {
        throw new ConflictError('This bar council number has a pending registration');
      }

      // Create registration request
      const { data: request, error } = await supabaseAdmin
        .from('lawyer_registration_requests')
        .insert({
          user_id: userId,
          ...registrationData,
          status: 'pending',
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new ConflictError('Registration request already exists');
        }
        throw error;
      }

      // Create notification for admin
      await supabaseAdmin
        .from('admin_notifications')
        .insert({
          type: 'lawyer_verification',
          title: 'New Lawyer Registration Request',
          message: `${req.user.display_name || 'A user'} has submitted a lawyer registration request.`,
          entity_type: 'lawyer_registration_request',
          entity_id: request.id,
          priority: 'medium',
        });

      logger.info({
        message: 'Lawyer registration submitted',
        userId,
        requestId: request.id,
      });

      res.status(201).json({
        success: true,
        message: 'Registration request submitted successfully. We will review your application and get back to you within 3-5 business days.',
        request: {
          id: request.id,
          status: request.status,
          submitted_at: request.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /lawyers/registration-status
   * Get current registration request status
   */
  async getRegistrationStatus(req, res, next) {
    try {
      const userId = req.user.id;

      // Check for lawyer profile first
      const { data: lawyer } = await supabaseAdmin
        .from('lawyers')
        .select(`
          id,
          verification_status,
          is_verified,
          verified_at,
          is_available,
          profile_completion_percentage
        `)
        .eq('user_id', userId)
        .single();

      if (lawyer) {
        return res.json({
          success: true,
          has_lawyer_profile: true,
          lawyer: {
            id: lawyer.id,
            verification_status: lawyer.verification_status,
            is_verified: lawyer.is_verified,
            verified_at: lawyer.verified_at,
            is_available: lawyer.is_available,
            profile_completion: lawyer.profile_completion_percentage,
          },
          registration: null,
        });
      }

      // Check registration request
      const { data: request, error } = await supabaseAdmin
        .from('lawyer_registration_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      res.json({
        success: true,
        has_lawyer_profile: false,
        lawyer: null,
        registration: request ? {
          id: request.id,
          status: request.status,
          submission_count: request.submission_count,
          submitted_at: request.last_submitted_at || request.created_at,
          reviewed_at: request.reviewed_at,
          review_notes: request.status === 'requires_changes' ? request.changes_requested : null,
          rejection_reason: request.status === 'rejected' ? request.rejection_reason : null,
        } : null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /lawyers/registration
   * Update registration request (for resubmission after changes requested)
   */
  async updateRegistration(req, res, next) {
    try {
      const userId = req.user.id;
      const updates = req.body;

      // Get existing request
      const { data: request, error: fetchError } = await supabaseAdmin
        .from('lawyer_registration_requests')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError || !request) {
        throw new NotFoundError('No registration request found');
      }

      // Only allow updates if status is 'requires_changes' or 'rejected'
      if (!['requires_changes', 'rejected'].includes(request.status)) {
        throw new ValidationError(`Cannot update registration with status: ${request.status}`);
      }

      // Update request
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('lawyer_registration_requests')
        .update({
          ...updates,
          status: 'pending',
          submission_count: request.submission_count + 1,
          last_submitted_at: new Date().toISOString(),
          reviewed_at: null,
          reviewed_by: null,
          review_notes: null,
          changes_requested: null,
          rejection_reason: null,
        })
        .eq('id', request.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Notify admin
      await supabaseAdmin
        .from('admin_notifications')
        .insert({
          type: 'lawyer_verification',
          title: 'Lawyer Registration Resubmitted',
          message: `${req.user.display_name || 'A user'} has resubmitted their lawyer registration request.`,
          entity_type: 'lawyer_registration_request',
          entity_id: request.id,
          priority: 'medium',
        });

      logger.info({
        message: 'Lawyer registration resubmitted',
        userId,
        requestId: request.id,
        submissionCount: updated.submission_count,
      });

      res.json({
        success: true,
        message: 'Registration request updated and resubmitted for review',
        request: {
          id: updated.id,
          status: updated.status,
          submission_count: updated.submission_count,
          submitted_at: updated.last_submitted_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /lawyers/registration
   * Withdraw registration request
   */
  async withdrawRegistration(req, res, next) {
    try {
      const userId = req.user.id;

      const { data: request, error: fetchError } = await supabaseAdmin
        .from('lawyer_registration_requests')
        .select('id, status')
        .eq('user_id', userId)
        .single();

      if (fetchError || !request) {
        throw new NotFoundError('No registration request found');
      }

      // Cannot withdraw approved requests
      if (request.status === 'approved') {
        throw new ValidationError('Cannot withdraw an approved registration');
      }

      const { error: deleteError } = await supabaseAdmin
        .from('lawyer_registration_requests')
        .delete()
        .eq('id', request.id);

      if (deleteError) throw deleteError;

      logger.info({
        message: 'Lawyer registration withdrawn',
        userId,
        requestId: request.id,
      });

      res.json({
        success: true,
        message: 'Registration request withdrawn successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /lawyers/me (for verified lawyers)
   * Get own lawyer profile
   */
  async getMyProfile(req, res, next) {
    try {
      const userId = req.user.id;

      const { data: lawyer, error } = await supabaseAdmin
        .from('lawyers')
        .select(`
          *,
          users:user_id(
            first_name,
            last_name,
            display_name,
            email,
            phone,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error || !lawyer) {
        throw new NotFoundError('Lawyer profile not found');
      }

      // Get recent consultations stats
      const { data: stats } = await supabaseAdmin
        .from('consultations')
        .select('status')
        .eq('lawyer_id', lawyer.id)
        .gte('booking_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      const recentStats = {
        total: stats?.length || 0,
        completed: stats?.filter(s => s.status === 'completed').length || 0,
        cancelled: stats?.filter(s => s.status === 'cancelled').length || 0,
        pending: stats?.filter(s => s.status === 'pending').length || 0,
        confirmed: stats?.filter(s => s.status === 'confirmed').length || 0,
      };

      res.json({
        success: true,
        lawyer: {
          ...lawyer,
          user: lawyer.users,
          recent_stats: recentStats,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /lawyers/me
   * Update own lawyer profile
   */
  async updateMyProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const updates = req.body;

      // Get lawyer profile
      const { data: lawyer, error: fetchError } = await supabaseAdmin
        .from('lawyers')
        .select('id, is_verified')
        .eq('user_id', userId)
        .single();

      if (fetchError || !lawyer) {
        throw new NotFoundError('Lawyer profile not found');
      }

      // Fields that cannot be changed after verification
      const protectedFields = [
        'bar_council_number',
        'bar_council_state',
        'bar_council_enrollment_date',
        'verification_status',
        'is_verified',
        'verified_at',
        'verified_by',
      ];

      // Remove protected fields from updates
      for (const field of protectedFields) {
        delete updates[field];
      }

      // Validate consultation fee changes (not too drastic)
      if (updates.consultation_fee !== undefined) {
        const { data: currentLawyer } = await supabaseAdmin
          .from('lawyers')
          .select('consultation_fee')
          .eq('id', lawyer.id)
          .single();

        const currentFee = currentLawyer.consultation_fee;
        const newFee = updates.consultation_fee;
        
        // Allow up to 3x increase or down to 1/3
        if (currentFee > 0 && (newFee > currentFee * 3 || newFee < currentFee / 3)) {
          throw new ValidationError('Fee changes cannot exceed 3x the current rate. Contact support for larger changes.');
        }
      }

      // Update lawyer profile
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('lawyers')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', lawyer.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Invalidate cache
      await cache.del(`lawyer:${lawyer.id}`);

      logger.info({
        message: 'Lawyer profile updated',
        lawyerId: lawyer.id,
        userId,
        updatedFields: Object.keys(updates),
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        lawyer: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /lawyers/me/availability/bulk
   * Set availability for multiple days at once
   */
  async setBulkAvailability(req, res, next) {
    try {
      const userId = req.user.id;
      const { slots, replace_existing = false } = req.body;

      const { data: lawyer, error: lawyerError } = await supabaseAdmin
        .from('lawyers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (lawyerError || !lawyer) {
        throw new NotFoundError('Lawyer profile not found');
      }

      // If replacing, delete existing availability
      if (replace_existing) {
        await supabaseAdmin
          .from('lawyer_availability')
          .delete()
          .eq('lawyer_id', lawyer.id);
      }

      // Insert new slots
      const availabilityData = slots.map(slot => ({
        lawyer_id: lawyer.id,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_active: slot.is_active !== false,
      }));

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('lawyer_availability')
        .upsert(availabilityData, {
          onConflict: 'lawyer_id,day_of_week,start_time',
        })
        .select();

      if (insertError) throw insertError;

      // Invalidate all availability caches for this lawyer
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const day of days) {
        await cache.del(`lawyer:${lawyer.id}:availability:${day}`);
      }

      logger.info({
        message: 'Bulk availability set',
        lawyerId: lawyer.id,
        slotsCount: inserted.length,
      });

      res.json({
        success: true,
        message: `${inserted.length} availability slots configured`,
        availability: inserted,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /lawyers/me/unavailability
   * Set unavailability dates (vacation, holidays)
   */
  async setUnavailability(req, res, next) {
    try {
      const userId = req.user.id;
      const { unavailable_dates } = req.body;

      const { data: lawyer, error: lawyerError } = await supabaseAdmin
        .from('lawyers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (lawyerError || !lawyer) {
        throw new NotFoundError('Lawyer profile not found');
      }

      // Check for conflicts with existing bookings
      for (const date of unavailable_dates) {
        const { data: bookings } = await supabaseAdmin
          .from('consultations')
          .select('id, booking_time')
          .eq('lawyer_id', lawyer.id)
          .eq('booking_date', date.date)
          .in('status', ['pending', 'confirmed']);

        if (bookings && bookings.length > 0) {
          const hasConflict = !date.start_time || bookings.some(b => {
            if (!date.start_time) return true;
            return b.booking_time >= date.start_time && b.booking_time < date.end_time;
          });

          if (hasConflict) {
            throw new ConflictError(
              `Cannot set unavailability on ${date.date} - you have ${bookings.length} confirmed consultation(s). Please reschedule them first.`
            );
          }
        }
      }

      // Insert unavailability
      const unavailabilityData = unavailable_dates.map(d => ({
        lawyer_id: lawyer.id,
        unavailable_date: d.date,
        start_time: d.start_time || null,
        end_time: d.end_time || null,
        reason: d.reason || null,
      }));

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('lawyer_unavailability')
        .upsert(unavailabilityData, {
          onConflict: 'lawyer_id,unavailable_date,start_time',
        })
        .select();

      if (insertError) throw insertError;

      // Invalidate availability caches
      for (const d of unavailable_dates) {
        await cache.del(`lawyer:${lawyer.id}:availability:${d.date}`);
      }

      logger.info({
        message: 'Unavailability set',
        lawyerId: lawyer.id,
        datesCount: inserted.length,
      });

      res.json({
        success: true,
        message: `${inserted.length} unavailability period(s) set`,
        unavailability: inserted,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /lawyers/me/consultations
   * Get lawyer's own consultations
   */
  async getMyConsultations(req, res, next) {
    try {
      const userId = req.user.id;
      const { status, from_date, to_date, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const { data: lawyer, error: lawyerError } = await supabaseAdmin
        .from('lawyers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (lawyerError || !lawyer) {
        throw new NotFoundError('Lawyer profile not found');
      }

      let query = supabaseAdmin
        .from('consultations')
        .select(`
          *,
          users:user_id(
            id,
            display_name,
            email,
            phone,
            avatar_url
          ),
          payments(status, paid_at)
        `, { count: 'exact' })
        .eq('lawyer_id', lawyer.id);

      if (status) {
        query = query.eq('status', status);
      }
      if (from_date) {
        query = query.gte('booking_date', from_date);
      }
      if (to_date) {
        query = query.lte('booking_date', to_date);
      }

      const { data, error, count } = await query
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      res.json({
        success: true,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        consultations: data.map(c => ({
          id: c.id,
          reference: c.reference_number,
          client: {
            id: c.users.id,
            name: c.users.display_name,
            email: c.users.email,
            phone: c.users.phone,
            avatar: c.users.avatar_url,
          },
          booking: {
            date: c.booking_date,
            time: c.booking_time,
            type: c.consultation_type,
            duration: c.duration,
          },
          status: c.status,
          amount: c.amount,
          payment_status: c.payments?.[0]?.status || 'pending',
          problem_description: c.problem_description,
          meeting_link: c.meeting_link,
          notes: c.lawyer_notes || c.notes,
          created_at: c.created_at,
        })),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /lawyers/me/dashboard
   * Get lawyer dashboard stats
   */
  async getDashboard(req, res, next) {
    try {
      const userId = req.user.id;

      const { data: lawyer, error: lawyerError } = await supabaseAdmin
        .from('lawyers')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (lawyerError || !lawyer) {
        throw new NotFoundError('Lawyer profile not found');
      }

      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Today's consultations
      const { data: todayConsultations } = await supabaseAdmin
        .from('consultations')
        .select('id, booking_time, status, users:user_id(display_name)')
        .eq('lawyer_id', lawyer.id)
        .eq('booking_date', today)
        .in('status', ['confirmed', 'pending'])
        .order('booking_time', { ascending: true });

      // This month's stats
      const { data: monthStats } = await supabaseAdmin
        .from('consultations')
        .select('status, amount')
        .eq('lawyer_id', lawyer.id)
        .gte('booking_date', thirtyDaysAgo);

      const stats = {
        completed: 0,
        cancelled: 0,
        total: monthStats?.length || 0,
        earnings: 0,
      };

      for (const c of monthStats || []) {
        if (c.status === 'completed') {
          stats.completed++;
          stats.earnings += c.amount || 0;
        } else if (c.status === 'cancelled') {
          stats.cancelled++;
        }
      }

      // Pending reviews count
      const { count: pendingReviews } = await supabaseAdmin
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('lawyer_id', lawyer.id)
        .is('lawyer_response', null);

      res.json({
        success: true,
        dashboard: {
          profile: {
            rating: lawyer.rating,
            total_reviews: lawyer.total_reviews,
            total_consultations: lawyer.total_consultations,
            is_available: lawyer.is_available,
            profile_completion: lawyer.profile_completion_percentage,
          },
          today: {
            consultations: todayConsultations?.length || 0,
            schedule: todayConsultations?.map(c => ({
              id: c.id,
              time: c.booking_time,
              status: c.status,
              client_name: c.users?.display_name,
            })) || [],
          },
          month: {
            total: stats.total,
            completed: stats.completed,
            cancelled: stats.cancelled,
            earnings: stats.earnings,
            completion_rate: stats.total > 0 
              ? Math.round((stats.completed / stats.total) * 100) 
              : 0,
          },
          pending_actions: {
            reviews_to_respond: pendingReviews || 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LawyerRegistrationController();
