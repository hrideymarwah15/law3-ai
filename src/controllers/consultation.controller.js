const { supabaseAdmin } = require('../config/supabase');
const { cache } = require('../config/redis');
const paymentService = require('../services/payment.service');
const videoService = require('../services/video.service');
const smsService = require('../services/sms.service');
const meetingScheduler = require('../services/meeting-scheduler.service');
const { 
  NotFoundError, 
  ValidationError, 
  ForbiddenError,
  ConflictError 
} = require('../middleware/errorHandler');
const logger = require('../config/logger');

class ConsultationController {
  /**
   * POST /consultations/book
   * Book a consultation with a lawyer
   */
  async book(req, res, next) {
    try {
      const { lawyer_id, booking_date, booking_time, problem_description } = req.body;
      const userId = req.user.id;

      // Check lawyer exists and is available
      const { data: lawyer, error: lawyerError } = await supabaseAdmin
        .from('lawyers')
        .select('*, users:user_id(display_name, phone)')
        .eq('id', lawyer_id)
        .eq('is_verified', true)
        .eq('is_available', true)
        .single();

      if (lawyerError || !lawyer) {
        throw new NotFoundError('Lawyer not found or not available');
      }

      // Check slot availability
      const { data: existingBooking } = await supabaseAdmin
        .from('consultations')
        .select('id')
        .eq('lawyer_id', lawyer_id)
        .eq('booking_date', booking_date)
        .eq('booking_time', booking_time)
        .in('status', ['pending', 'confirmed'])
        .single();

      if (existingBooking) {
        throw new ConflictError('This time slot is already booked');
      }

      // Create Razorpay order
      const amount = lawyer.consultation_fee;
      const consultationId = crypto.randomUUID();

      const order = await paymentService.createOrder(
        amount,
        consultationId,
        { lawyer_id, user_id: userId }
      );

      // Create consultation record
      const { data: consultation, error: consultationError } = await supabaseAdmin
        .from('consultations')
        .insert({
          id: consultationId,
          user_id: userId,
          lawyer_id,
          booking_date,
          booking_time,
          problem_description,
          amount,
          status: 'pending',
          payment_status: 'pending',
        })
        .select()
        .single();

      if (consultationError) {
        throw new ValidationError(consultationError.message);
      }

      // Create payment record
      await supabaseAdmin
        .from('payments')
        .insert({
          user_id: userId,
          consultation_id: consultationId,
          amount,
          razorpay_order_id: order.order_id,
          status: 'initiated',
        });

      logger.info({ 
        message: 'Consultation booked', 
        consultationId, 
        userId, 
        lawyerId: lawyer_id 
      });

      // Invalidate cache
      await cache.del(`lawyer:${lawyer_id}:availability:${booking_date}`);

      res.status(201).json({
        success: true,
        message: 'Booking created successfully. Please complete payment.',
        consultation: {
          id: consultation.id,
          amount,
          status: consultation.status,
          payment_order_id: order.order_id,
        },
        razorpay: {
          key_id: process.env.RAZORPAY_KEY_ID,
          order_id: order.order_id,
          amount: order.amount * 100, // Razorpay expects paise
          currency: order.currency,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /consultations/:consultation_id/confirm-payment
   * Confirm payment after Razorpay callback
   */
  async confirmPayment(req, res, next) {
    try {
      const { consultation_id } = req.params;
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
      const userId = req.user.id;

      // Verify consultation exists and belongs to user
      const { data: consultation, error: consultationError } = await supabaseAdmin
        .from('consultations')
        .select('*, lawyers:lawyer_id(*, users:user_id(display_name, phone))')
        .eq('id', consultation_id)
        .eq('user_id', userId)
        .single();

      if (consultationError || !consultation) {
        throw new NotFoundError('Consultation not found');
      }

      if (consultation.payment_status === 'completed') {
        throw new ConflictError('Payment already confirmed');
      }

      // Verify Razorpay signature
      const isValid = paymentService.verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isValid) {
        logger.warn({ 
          message: 'Invalid payment signature', 
          consultationId: consultation_id 
        });
        throw new ValidationError('Invalid payment signature');
      }

      // Generate meeting link
      const meetingLink = videoService.generateMeetingLink(consultation_id);

      // Update consultation
      const { data: updatedConsultation } = await supabaseAdmin
        .from('consultations')
        .update({
          status: 'confirmed',
          payment_status: 'completed',
          meeting_link: meetingLink,
          updated_at: new Date().toISOString(),
        })
        .eq('id', consultation_id)
        .select()
        .single();

      // Update payment record
      await supabaseAdmin
        .from('payments')
        .update({
          razorpay_payment_id,
          razorpay_signature,
          status: 'success',
          updated_at: new Date().toISOString(),
        })
        .eq('consultation_id', consultation_id);

      // Update lawyer's consultation count
      await supabaseAdmin.rpc('increment', {
        table_name: 'lawyers',
        column_name: 'total_consultations',
        row_id: consultation.lawyer_id,
      });

      // Send SMS confirmation
      try {
        await smsService.sendBookingConfirmation(
          req.user.phone,
          consultation.lawyers.users.display_name,
          consultation.booking_date,
          consultation.booking_time,
          consultation.amount
        );
      } catch (smsError) {
        logger.error({ message: 'SMS notification failed', error: smsError.message });
      }

      logger.info({ 
        message: 'Payment confirmed', 
        consultationId: consultation_id,
        paymentId: razorpay_payment_id 
      });

      res.json({
        success: true,
        message: 'Payment confirmed, consultation booked',
        consultation: {
          id: updatedConsultation.id,
          status: updatedConsultation.status,
          meeting_link: meetingLink,
          booking_date: updatedConsultation.booking_date,
          booking_time: updatedConsultation.booking_time,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /consultations/my-consultations
   * Get user's consultations
   */
  async getMyConsultations(req, res, next) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const userId = req.user.id;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('consultations')
        .select(`
          *,
          lawyers:lawyer_id(
            id,
            specialization,
            users:user_id(display_name, avatar_url)
          )
        `, { count: 'exact' })
        .eq('user_id', userId);

      if (status) {
        query = query.eq('status', status);
      }

      query = query
        .order('booking_date', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // Check if user can review completed consultations
      const consultationsWithReviewStatus = await Promise.all(
        data.map(async (c) => {
          let canReview = false;
          if (c.status === 'completed') {
            const { data: existingReview } = await supabaseAdmin
              .from('reviews')
              .select('id')
              .eq('consultation_id', c.id)
              .single();
            canReview = !existingReview;
          }

          return {
            id: c.id,
            lawyer: {
              id: c.lawyers.id,
              display_name: c.lawyers.users.display_name,
              avatar_url: c.lawyers.users.avatar_url,
              specialization: c.lawyers.specialization,
            },
            booking_date: c.booking_date,
            booking_time: c.booking_time,
            status: c.status,
            payment_status: c.payment_status,
            amount: c.amount,
            meeting_link: c.status === 'confirmed' ? c.meeting_link : null,
            can_review: canReview,
            created_at: c.created_at,
          };
        })
      );

      res.json({
        success: true,
        total: count,
        page,
        limit,
        consultations: consultationsWithReviewStatus,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /consultations/:consultation_id/cancel
   * Cancel a consultation
   */
  async cancel(req, res, next) {
    try {
      const { consultation_id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      // Fetch consultation
      const { data: consultation, error: fetchError } = await supabaseAdmin
        .from('consultations')
        .select('*, payments(*)')
        .eq('id', consultation_id)
        .single();

      if (fetchError || !consultation) {
        throw new NotFoundError('Consultation not found');
      }

      // Check ownership (user or admin)
      if (consultation.user_id !== userId && req.user.role !== 'admin') {
        throw new ForbiddenError('You cannot cancel this consultation');
      }

      // Check if cancellation is allowed (24 hours before)
      const bookingDateTime = new Date(`${consultation.booking_date}T${consultation.booking_time}`);
      const now = new Date();
      const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

      if (hoursUntilBooking < 24 && req.user.role !== 'admin') {
        throw new ValidationError('Cancellation must be done at least 24 hours before the consultation');
      }

      // Update consultation status
      await supabaseAdmin
        .from('consultations')
        .update({
          status: 'cancelled',
          notes: reason || 'Cancelled by user',
          updated_at: new Date().toISOString(),
        })
        .eq('id', consultation_id);

      // Initiate refund if payment was completed
      let refundStatus = null;
      if (consultation.payment_status === 'completed' && consultation.payments?.length > 0) {
        const payment = consultation.payments[0];
        if (payment.razorpay_payment_id) {
          try {
            await paymentService.initiateRefund(payment.razorpay_payment_id);
            refundStatus = 'initiated';

            await supabaseAdmin
              .from('payments')
              .update({
                status: 'refunded',
                refund_amount: consultation.amount,
                refund_date: new Date().toISOString(),
              })
              .eq('id', payment.id);
          } catch (refundError) {
            logger.error({ message: 'Refund failed', error: refundError.message });
            refundStatus = 'failed';
          }
        }
      }

      // Send cancellation SMS
      try {
        await smsService.sendCancellationNotice(
          req.user.phone,
          'Lawyer',
          consultation.booking_date,
          refundStatus
        );
      } catch (smsError) {
        logger.error({ message: 'Cancellation SMS failed', error: smsError.message });
      }

      logger.info({ 
        message: 'Consultation cancelled', 
        consultationId: consultation_id,
        refundStatus 
      });

      res.json({
        success: true,
        message: 'Consultation cancelled',
        refund_status: refundStatus,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /consultations/:consultation_id/complete
   * Mark consultation as completed (lawyer/admin only)
   */
  async complete(req, res, next) {
    try {
      const { consultation_id } = req.params;
      const { notes } = req.body;

      // Fetch consultation
      const { data: consultation, error: fetchError } = await supabaseAdmin
        .from('consultations')
        .select('*, lawyers:lawyer_id(user_id)')
        .eq('id', consultation_id)
        .single();

      if (fetchError || !consultation) {
        throw new NotFoundError('Consultation not found');
      }

      // Check authorization (lawyer or admin)
      const isLawyer = consultation.lawyers.user_id === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isLawyer && !isAdmin) {
        throw new ForbiddenError('Only the assigned lawyer or admin can complete this consultation');
      }

      if (consultation.status !== 'confirmed') {
        throw new ValidationError('Only confirmed consultations can be marked as completed');
      }

      // Update consultation
      const { data: updated } = await supabaseAdmin
        .from('consultations')
        .update({
          status: 'completed',
          notes: notes || consultation.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', consultation_id)
        .select()
        .single();

      logger.info({ 
        message: 'Consultation completed', 
        consultationId: consultation_id 
      });

      res.json({
        success: true,
        message: 'Consultation marked as completed',
        consultation: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /consultations/upcoming-video
   * Get upcoming video consultations for user or lawyer dashboard
   */
  async getUpcomingVideoConsultations(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { hours = 24 } = req.query; // Default: next 24 hours

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().slice(0, 5);

      // Calculate end date/time (X hours from now)
      const endDate = new Date(now.getTime() + parseInt(hours) * 60 * 60 * 1000);
      const endDateStr = endDate.toISOString().split('T')[0];

      let query = supabaseAdmin
        .from('consultations')
        .select(`
          id,
          booking_date,
          booking_time,
          consultation_type,
          status,
          meeting_link,
          meeting_provider,
          meeting_link_generated_at,
          problem_description,
          amount,
          user_id,
          lawyer_id,
          users:user_id(id, display_name, email, phone, avatar_url),
          lawyers:lawyer_id(
            id,
            user_id,
            specialization,
            profile_photo_url,
            users:user_id(id, display_name, email, phone)
          )
        `)
        .eq('status', 'confirmed')
        .eq('consultation_type', 'video')
        .gte('booking_date', today)
        .lte('booking_date', endDateStr)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      // Filter by role
      if (userRole === 'lawyer' && req.user.lawyerProfile) {
        query = query.eq('lawyer_id', req.user.lawyerProfile.id);
      } else if (userRole === 'user') {
        query = query.eq('user_id', userId);
      } else if (userRole === 'admin') {
        // Admin sees all
      } else {
        query = query.eq('user_id', userId);
      }

      const { data: consultations, error } = await query;

      if (error) {
        throw error;
      }

      // Filter out past consultations for today
      const upcomingConsultations = consultations.filter(c => {
        if (c.booking_date > today) return true;
        if (c.booking_date === today && c.booking_time >= currentTime) return true;
        return false;
      });

      // Calculate time until each consultation
      const consultationsWithTiming = upcomingConsultations.map(c => {
        const consultationDateTime = new Date(`${c.booking_date}T${c.booking_time}:00`);
        const minutesUntil = Math.round((consultationDateTime - now) / (1000 * 60));
        
        return {
          id: c.id,
          booking_date: c.booking_date,
          booking_time: c.booking_time,
          status: c.status,
          consultation_type: c.consultation_type,
          meeting_link: c.meeting_link,
          meeting_provider: c.meeting_provider,
          is_meeting_link_ready: !!c.meeting_link,
          meeting_link_generated_at: c.meeting_link_generated_at,
          problem_description: c.problem_description,
          amount: c.amount,
          minutes_until_start: minutesUntil,
          can_join: minutesUntil <= 5 && minutesUntil >= -30, // Can join 5 min before to 30 min after
          is_starting_soon: minutesUntil <= 10 && minutesUntil > 0,
          user: userRole === 'lawyer' ? {
            id: c.users?.id,
            display_name: c.users?.display_name,
            avatar_url: c.users?.avatar_url
          } : null,
          lawyer: userRole !== 'lawyer' ? {
            id: c.lawyers?.id,
            display_name: c.lawyers?.users?.display_name,
            specialization: c.lawyers?.specialization,
            profile_photo_url: c.lawyers?.profile_photo_url
          } : null
        };
      });

      res.json({
        success: true,
        count: consultationsWithTiming.length,
        consultations: consultationsWithTiming
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /consultations/:consultation_id/meeting
   * Get meeting details for a specific consultation
   */
  async getMeetingDetails(req, res, next) {
    try {
      const { consultation_id } = req.params;
      const userId = req.user.id;

      const { data: consultation, error } = await supabaseAdmin
        .from('consultations')
        .select(`
          id,
          booking_date,
          booking_time,
          consultation_type,
          status,
          meeting_link,
          meeting_provider,
          meeting_room_name,
          meeting_link_generated_at,
          user_id,
          lawyer_id,
          users:user_id(id, display_name, email),
          lawyers:lawyer_id(
            id,
            user_id,
            users:user_id(id, display_name, email)
          )
        `)
        .eq('id', consultation_id)
        .single();

      if (error || !consultation) {
        throw new NotFoundError('Consultation not found');
      }

      // Check authorization
      const isUser = consultation.user_id === userId;
      const isLawyer = consultation.lawyers?.user_id === userId;
      const isAdmin = req.user.role === 'admin';

      if (!isUser && !isLawyer && !isAdmin) {
        throw new ForbiddenError('You do not have access to this consultation');
      }

      if (consultation.consultation_type !== 'video') {
        throw new ValidationError('This is not a video consultation');
      }

      if (consultation.status !== 'confirmed') {
        throw new ValidationError('Consultation is not confirmed');
      }

      // Calculate timing
      const now = new Date();
      const consultationDateTime = new Date(`${consultation.booking_date}T${consultation.booking_time}:00`);
      const minutesUntil = Math.round((consultationDateTime - now) / (1000 * 60));

      res.json({
        success: true,
        meeting: {
          consultation_id: consultation.id,
          meeting_link: consultation.meeting_link,
          meeting_provider: consultation.meeting_provider || 'jitsi',
          room_name: consultation.meeting_room_name,
          is_ready: !!consultation.meeting_link,
          link_generated_at: consultation.meeting_link_generated_at,
          booking_date: consultation.booking_date,
          booking_time: consultation.booking_time,
          minutes_until_start: minutesUntil,
          can_join: minutesUntil <= 5 && minutesUntil >= -30,
          other_participant: isUser ? {
            name: consultation.lawyers?.users?.display_name,
            role: 'lawyer'
          } : {
            name: consultation.users?.display_name,
            role: 'client'
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /consultations/:consultation_id/generate-meeting-link
   * Manually generate meeting link (for testing or immediate needs)
   */
  async generateMeetingLink(req, res, next) {
    try {
      const { consultation_id } = req.params;
      const userId = req.user.id;

      // Get consultation
      const { data: consultation, error } = await supabaseAdmin
        .from('consultations')
        .select(`
          *,
          lawyers:lawyer_id(user_id)
        `)
        .eq('id', consultation_id)
        .single();

      if (error || !consultation) {
        throw new NotFoundError('Consultation not found');
      }

      // Check authorization (only lawyer, user, or admin can generate)
      const isUser = consultation.user_id === userId;
      const isLawyer = consultation.lawyers?.user_id === userId;
      const isAdmin = req.user.role === 'admin';

      if (!isUser && !isLawyer && !isAdmin) {
        throw new ForbiddenError('You cannot generate meeting link for this consultation');
      }

      if (consultation.consultation_type !== 'video') {
        throw new ValidationError('This is not a video consultation');
      }

      if (consultation.status !== 'confirmed') {
        throw new ValidationError('Consultation must be confirmed before generating meeting link');
      }

      // Generate meeting link
      const result = await meetingScheduler.forceGenerateMeetingLink(consultation_id);

      res.json({
        success: true,
        message: result.isNew ? 'Meeting link generated successfully' : 'Meeting link already exists',
        meeting: {
          meeting_link: result.consultation.meeting_link || result.meeting?.meeting_link,
          provider: 'jitsi',
          is_new: result.isNew
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConsultationController();
