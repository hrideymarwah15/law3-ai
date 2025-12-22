/**
 * Consultation Service
 * 
 * Handles consultation-related business logic including:
 * - Booking consultations
 * - Scheduling management
 * - Status transitions
 * - Payment coordination
 * 
 * @extends BaseService
 */

const BaseService = require('./base.service');
const { 
  NotFoundError, 
  ConflictError, 
  ValidationError, 
  ForbiddenError,
} = require('../middleware/errorHandler');
const notificationService = require('./notification.service');

/**
 * Valid consultation status transitions
 */
const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'rescheduled'],
  in_progress: ['completed', 'cancelled'],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
  rescheduled: ['pending', 'cancelled'],
};

class ConsultationService extends BaseService {
  /**
   * @param {Object} options
   * @param {ConsultationRepository} options.consultationRepository
   * @param {LawyerRepository} options.lawyerRepository
   * @param {UserRepository} options.userRepository
   * @param {Object} [options.dependencies]
   */
  constructor({ consultationRepository, lawyerRepository, userRepository, dependencies = {} }) {
    super({ repository: consultationRepository, dependencies });
    this.consultationRepository = consultationRepository;
    this.lawyerRepository = lawyerRepository;
    this.userRepository = userRepository;
  }

  /**
   * Create a new consultation booking
   * @param {Object} bookingData
   * @returns {Promise<Object>}
   */
  async createConsultation(bookingData) {
    const { user_id, lawyer_id, scheduled_at, type, notes } = bookingData;

    return this.withAudit('createConsultation', { user_id, lawyer_id }, async () => {
      // Validate user exists
      await this.userRepository.findByIdOrFail(user_id);

      // Validate lawyer exists and is available
      const lawyer = await this.lawyerRepository.findByIdOrFail(lawyer_id);
      
      if (lawyer.verification_status !== 'verified') {
        throw new ValidationError('Lawyer is not verified');
      }

      if (!lawyer.is_available) {
        throw new ValidationError('Lawyer is not currently accepting consultations');
      }

      // Validate scheduled time
      const scheduledDate = new Date(scheduled_at);
      const now = new Date();

      if (scheduledDate <= now) {
        throw new ValidationError('Consultation must be scheduled for a future time');
      }

      // Check minimum advance booking (e.g., 2 hours)
      const minAdvanceHours = 2;
      const minBookingTime = new Date(now.getTime() + minAdvanceHours * 60 * 60 * 1000);
      if (scheduledDate < minBookingTime) {
        throw new ValidationError(`Consultation must be scheduled at least ${minAdvanceHours} hours in advance`);
      }

      // Parse scheduled_at into date and time components
      const bookingDate = scheduledDate.toISOString().split('T')[0];
      const bookingTime = scheduledDate.toTimeString().slice(0, 5);

      // Check slot availability
      const isAvailable = await this.consultationRepository.isSlotAvailable(
        lawyer_id,
        bookingDate,
        bookingTime
      );

      if (!isAvailable) {
        throw new ConflictError('The selected time slot is not available');
      }

      // Create consultation
      const consultation = await this.consultationRepository.create({
        user_id,
        lawyer_id,
        booking_date: bookingDate,
        booking_time: bookingTime,
        scheduled_at,
        type: type || 'video',
        status: 'pending',
        notes: notes?.trim() || null,
        fee: lawyer.consultation_fee,
        created_at: new Date().toISOString(),
      });

      this.emit('consultation:created', {
        consultationId: consultation.id,
        userId: user_id,
        lawyerId: lawyer_id,
        scheduledAt: scheduled_at,
      });

      // Send notification to user about booking confirmation
      await notificationService.create({
        userId: user_id,
        title: 'Consultation Booked',
        body: `Your consultation with ${lawyer.users?.display_name || 'the lawyer'} has been booked for ${bookingDate} at ${bookingTime}. Awaiting confirmation.`,
        type: 'consultation',
        category: 'consultation',
        priority: 'normal',
        entityType: 'consultation',
        entityId: consultation.id,
        actionUrl: `/consultations/${consultation.id}`,
        channels: ['push', 'email'],
        metadata: {
          consultation_id: consultation.id,
          lawyer_id,
          booking_date: bookingDate,
          booking_time: bookingTime,
          status: 'pending',
        },
      });

      // Send notification to lawyer about new booking request
      await notificationService.create({
        userId: lawyer.user_id,
        title: 'New Consultation Request',
        body: `You have a new consultation request for ${bookingDate} at ${bookingTime}. Please confirm or decline.`,
        type: 'consultation',
        category: 'consultation',
        priority: 'high',
        entityType: 'consultation',
        entityId: consultation.id,
        actionUrl: `/lawyer/consultations/${consultation.id}`,
        channels: ['push', 'email', 'sms'],
        metadata: {
          consultation_id: consultation.id,
          user_id,
          booking_date: bookingDate,
          booking_time: bookingTime,
          status: 'pending',
        },
      });

      return consultation;
    });
  }

  /**
   * Get consultation by ID
   * @param {string} consultationId 
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async getConsultationById(consultationId, { includeRelations = true } = {}) {
    if (includeRelations) {
      return this.consultationRepository.findWithRelations(consultationId);
    }
    return this.consultationRepository.findByIdOrFail(consultationId);
  }

  /**
   * Get consultations for a user
   * @param {string} userId 
   * @param {Object} filters
   * @returns {Promise<{data: Object[], pagination: Object}>}
   */
  async getUserConsultations(userId, filters = {}) {
    const { status, page = 1, limit = 20 } = filters;
    return this.consultationRepository.findByUser(userId, { status, page, limit });
  }

  /**
   * Get consultations for a lawyer
   * @param {string} lawyerId 
   * @param {Object} filters
   * @returns {Promise<{data: Object[], pagination: Object}>}
   */
  async getLawyerConsultations(lawyerId, filters = {}) {
    const { status, page = 1, limit = 20 } = filters;
    return this.consultationRepository.findByLawyer(lawyerId, { status, page, limit });
  }

  /**
   * Update consultation status
   * @param {string} consultationId 
   * @param {string} newStatus 
   * @param {string} actorId - User or lawyer performing the action
   * @param {Object} [metadata]
   * @returns {Promise<Object>}
   */
  async updateStatus(consultationId, newStatus, actorId, metadata = {}) {
    return this.withAudit('updateStatus', { consultationId, newStatus, actorId }, async () => {
      const consultation = await this.consultationRepository.findByIdOrFail(consultationId);

      // Validate status transition
      const allowedTransitions = STATUS_TRANSITIONS[consultation.status] || [];
      if (!allowedTransitions.includes(newStatus)) {
        throw new ValidationError(
          `Cannot transition from '${consultation.status}' to '${newStatus}'`
        );
      }

      // Validate actor is part of the consultation
      if (actorId !== consultation.user_id && actorId !== consultation.lawyer_id) {
        throw new ForbiddenError('You are not authorized to update this consultation');
      }

      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      // Add status-specific fields
      if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by = actorId;
        updateData.cancellation_reason = metadata.reason || null;
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (newStatus === 'in_progress') {
        updateData.started_at = new Date().toISOString();
      }

      const updated = await this.consultationRepository.update(consultationId, updateData);

      this.emit(`consultation:${newStatus}`, {
        consultationId,
        userId: consultation.user_id,
        lawyerId: consultation.lawyer_id,
        actorId,
        metadata,
      });

      return updated;
    });
  }

  /**
   * Confirm consultation (lawyer action)
   * @param {string} consultationId 
   * @param {string} lawyerId 
   * @returns {Promise<Object>}
   */
  async confirmConsultation(consultationId, lawyerId) {
    const consultation = await this.consultationRepository.findByIdOrFail(consultationId);
    
    if (consultation.lawyer_id !== lawyerId) {
      throw new ForbiddenError('Only the assigned lawyer can confirm this consultation');
    }

    return this.updateStatus(consultationId, 'confirmed', lawyerId);
  }

  /**
   * Cancel consultation
   * @param {string} consultationId 
   * @param {string} actorId 
   * @param {string} reason 
   * @returns {Promise<Object>}
   */
  async cancelConsultation(consultationId, actorId, reason) {
    const consultation = await this.consultationRepository.findByIdOrFail(consultationId);

    // Check if still cancellable (e.g., more than 1 hour before scheduled time)
    const scheduledTime = new Date(consultation.scheduled_at);
    const now = new Date();
    const hoursUntilConsultation = (scheduledTime - now) / (1000 * 60 * 60);

    if (hoursUntilConsultation < 1 && consultation.status === 'confirmed') {
      // Late cancellation - may require different handling
      this.emit('consultation:lateCancellation', {
        consultationId,
        actorId,
        hoursUntilConsultation,
      });
    }

    return this.updateStatus(consultationId, 'cancelled', actorId, { reason });
  }

  /**
   * Reschedule consultation
   * @param {string} consultationId 
   * @param {string} newScheduledAt 
   * @param {string} actorId 
   * @returns {Promise<Object>}
   */
  async rescheduleConsultation(consultationId, newScheduledAt, actorId) {
    return this.withAudit('rescheduleConsultation', { consultationId, newScheduledAt, actorId }, async () => {
      const consultation = await this.consultationRepository.findByIdOrFail(consultationId);

      // Validate new time
      const newDate = new Date(newScheduledAt);
      const now = new Date();

      if (newDate <= now) {
        throw new ValidationError('New time must be in the future');
      }

      // Parse new datetime into date and time components
      const bookingDate = newDate.toISOString().split('T')[0];
      const bookingTime = newDate.toTimeString().slice(0, 5);

      // Check availability
      const isAvailable = await this.consultationRepository.isSlotAvailable(
        consultation.lawyer_id,
        bookingDate,
        bookingTime,
        consultationId // Exclude current consultation
      );

      if (!isAvailable) {
        throw new ConflictError('The new time slot is not available');
      }

      const updated = await this.consultationRepository.update(consultationId, {
        booking_date: bookingDate,
        booking_time: bookingTime,
        scheduled_at: newScheduledAt,
        previous_scheduled_at: consultation.scheduled_at,
        rescheduled_by: actorId,
        rescheduled_at: new Date().toISOString(),
        status: 'rescheduled',
      });

      this.emit('consultation:rescheduled', {
        consultationId,
        oldTime: consultation.scheduled_at,
        newTime: newScheduledAt,
        actorId,
      });

      return updated;
    });
  }

  /**
   * Get upcoming consultations for reminder processing
   * @param {number} minutesAhead 
   * @returns {Promise<Object[]>}
   */
  async getUpcomingForReminders(minutesAhead = 30) {
    return this.consultationRepository.getUpcoming(minutesAhead);
  }

  /**
   * Mark consultation as started
   * @param {string} consultationId 
   * @param {string} lawyerId 
   * @returns {Promise<Object>}
   */
  async startConsultation(consultationId, lawyerId) {
    const consultation = await this.consultationRepository.findByIdOrFail(consultationId);
    
    if (consultation.lawyer_id !== lawyerId) {
      throw new ForbiddenError('Only the assigned lawyer can start this consultation');
    }

    return this.updateStatus(consultationId, 'in_progress', lawyerId);
  }

  /**
   * Mark consultation as completed
   * @param {string} consultationId 
   * @param {string} lawyerId 
   * @param {Object} [completionData]
   * @returns {Promise<Object>}
   */
  async completeConsultation(consultationId, lawyerId, completionData = {}) {
    return this.withAudit('completeConsultation', { consultationId, lawyerId }, async () => {
      const consultation = await this.consultationRepository.findByIdOrFail(consultationId);
      
      if (consultation.lawyer_id !== lawyerId) {
        throw new ForbiddenError('Only the assigned lawyer can complete this consultation');
      }

      const updated = await this.updateStatus(consultationId, 'completed', lawyerId);

      // Update lawyer's consultation count
      await this.lawyerRepository.update(lawyerId, {
        total_consultations: await this.consultationRepository.count({
          lawyer_id: lawyerId,
          status: 'completed',
        }),
      });

      // Add summary if provided
      if (completionData.summary) {
        await this.consultationRepository.update(consultationId, {
          summary: completionData.summary,
          recommendations: completionData.recommendations,
        });
      }

      return updated;
    });
  }

  /**
   * Get consultation statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    return this.consultationRepository.getStats();
  }

  /**
   * Get revenue statistics
   * @param {string} period - 'day', 'week', 'month', 'year'
   * @returns {Promise<Object[]>}
   */
  async getRevenueByPeriod(period = 'month') {
    return this.consultationRepository.getRevenueByPeriod(period);
  }

  /**
   * Check if user can access consultation
   * @param {string} consultationId 
   * @param {string} userId 
   * @returns {Promise<boolean>}
   */
  async canUserAccess(consultationId, userId) {
    const consultation = await this.consultationRepository.findById(consultationId);
    
    if (!consultation) {
      return false;
    }

    return consultation.user_id === userId || consultation.lawyer_id === userId;
  }
}

module.exports = ConsultationService;
