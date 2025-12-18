const { supabaseAdmin } = require('../config/supabase');
const { cache } = require('../config/redis');
const paymentService = require('../services/payment.service');
const videoService = require('../services/video.service');
const smsService = require('../services/sms.service');
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
}

module.exports = new ConsultationController();
