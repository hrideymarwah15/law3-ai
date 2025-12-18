/**
 * Meeting Scheduler Service
 * Automatically generates meeting links for upcoming video consultations
 * 
 * Features:
 * - Runs every minute to check for upcoming consultations
 * - Generates Jitsi Meet links 2 minutes before scheduled time
 * - Notifies users via Socket.io when link is ready
 * - Sends SMS notifications (optional)
 */

const videoService = require('./video.service');
const smsService = require('./sms.service');
const logger = require('../config/logger');
const { supabaseAdmin } = require('../config/supabase');

class MeetingSchedulerService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.checkIntervalMs = 60 * 1000; // Check every 1 minute
    this.minutesBeforeMeeting = 2; // Generate link 2 minutes before
    this.io = null; // Socket.io instance
  }

  /**
   * Set Socket.io instance for real-time notifications
   */
  setSocketIO(io) {
    this.io = io;
    logger.info({ message: 'Meeting scheduler connected to Socket.io' });
  }

  /**
   * Start the scheduler
   * @param {Object} io - Socket.io instance for real-time notifications
   */
  start(io) {
    if (this.isRunning) {
      logger.warn({ message: 'Meeting scheduler already running' });
      return;
    }

    // Set Socket.io instance if provided
    if (io) {
      this.io = io;
    }

    this.isRunning = true;
    logger.info({ 
      message: 'Meeting scheduler started',
      checkInterval: `${this.checkIntervalMs / 1000}s`,
      minutesBefore: this.minutesBeforeMeeting
    });

    // Run immediately on start
    this.processUpcomingMeetings();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.processUpcomingMeetings();
    }, this.checkIntervalMs);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info({ message: 'Meeting scheduler stopped' });
  }

  /**
   * Process upcoming meetings that need links
   */
  async processUpcomingMeetings() {
    try {
      const consultations = await this.getUpcomingConsultations();
      
      if (consultations.length === 0) {
        return;
      }

      logger.info({
        message: 'Processing upcoming video consultations',
        count: consultations.length
      });

      for (const consultation of consultations) {
        await this.generateMeetingLink(consultation);
      }
    } catch (error) {
      logger.error({
        message: 'Error processing upcoming meetings',
        error: error.message
      });
    }
  }

  /**
   * Get consultations that need meeting links
   * - Status: confirmed
   * - Type: video
   * - No meeting link yet
   * - Starting within minutesBeforeMeeting
   */
  async getUpcomingConsultations() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Get times in UTC for comparison with scheduled_start
    const currentTimeUTC = now.toISOString();
    const cutoffTime = new Date(now.getTime() + (this.minutesBeforeMeeting + 1) * 60 * 1000);
    const cutoffTimeUTC = cutoffTime.toISOString();

    try {
      // Query using scheduled_start (TIMESTAMPTZ) for accurate time comparison
      const { data, error } = await supabaseAdmin
        .from('consultations')
        .select(`
          id,
          booking_date,
          booking_time,
          scheduled_start,
          consultation_type,
          status,
          meeting_link,
          user_id,
          lawyer_id,
          amount,
          problem_description,
          users:user_id(id, display_name, email, phone),
          lawyers:lawyer_id(
            id,
            user_id,
            specialization,
            users:user_id(id, display_name, email, phone)
          )
        `)
        .eq('status', 'confirmed')
        .in('consultation_type', ['video', 'audio'])
        .is('meeting_link', null)
        .gte('scheduled_start', currentTimeUTC)
        .lte('scheduled_start', cutoffTimeUTC);

      if (error) {
        throw error;
      }

      logger.debug({
        message: 'Checked for upcoming consultations',
        currentTime: currentTimeUTC,
        cutoffTime: cutoffTimeUTC,
        found: data?.length || 0
      });

      return data || [];
    } catch (error) {
      logger.error({
        message: 'Failed to get upcoming consultations',
        error: error.message
      });
      return [];
    }
  }

  /**
   * Generate meeting link for a consultation and notify users
   */
  async generateMeetingLink(consultation) {
    try {
      logger.info({
        message: 'Generating meeting link',
        consultationId: consultation.id,
        bookingTime: `${consultation.booking_date} ${consultation.booking_time}`
      });

      // Generate and save meeting link
      const result = await videoService.createMeetingForConsultation(consultation.id);
      
      if (!result.isNew) {
        // Link already existed
        return;
      }

      const meetingLink = result.meeting.meeting_link;

      // Notify via Socket.io
      await this.notifyUsers(consultation, meetingLink);

      // Send SMS notifications (optional, based on env)
      if (process.env.ENABLE_SMS_NOTIFICATIONS === 'true') {
        await this.sendSmsNotifications(consultation, meetingLink);
      }

      logger.info({
        message: 'Meeting link generated and notifications sent',
        consultationId: consultation.id,
        meetingLink
      });
    } catch (error) {
      logger.error({
        message: 'Failed to generate meeting link',
        consultationId: consultation.id,
        error: error.message
      });
    }
  }

  /**
   * Notify users via Socket.io
   */
  async notifyUsers(consultation, meetingLink) {
    if (!this.io) {
      logger.warn({ message: 'Socket.io not available for notifications' });
      return;
    }

    const userId = consultation.user_id;
    const lawyerUserId = consultation.lawyers?.user_id;

    const notification = {
      type: 'MEETING_LINK_READY',
      consultation_id: consultation.id,
      meeting_link: meetingLink,
      booking_date: consultation.booking_date,
      booking_time: consultation.booking_time,
      message: 'Your video consultation is about to start! Click to join.',
      timestamp: new Date().toISOString()
    };

    // Emit to user
    this.io.to(`user:${userId}`).emit('meeting:ready', notification);
    
    // Emit to lawyer
    if (lawyerUserId) {
      this.io.to(`user:${lawyerUserId}`).emit('meeting:ready', notification);
    }

    logger.info({
      message: 'Socket notifications sent',
      userId,
      lawyerUserId,
      consultationId: consultation.id
    });
  }

  /**
   * Send SMS notifications
   */
  async sendSmsNotifications(consultation, meetingLink) {
    try {
      const userPhone = consultation.users?.phone;
      const lawyerPhone = consultation.lawyers?.users?.phone;
      const lawyerName = consultation.lawyers?.users?.display_name || 'Lawyer';
      const userName = consultation.users?.display_name || 'Client';

      // Notify user
      if (userPhone) {
        await smsService.sendMessage(
          userPhone,
          `Your video consultation with ${lawyerName} starts in 2 minutes! Join: ${meetingLink}`
        );
      }

      // Notify lawyer
      if (lawyerPhone) {
        await smsService.sendMessage(
          lawyerPhone,
          `Your video consultation with ${userName} starts in 2 minutes! Join: ${meetingLink}`
        );
      }
    } catch (error) {
      logger.error({
        message: 'Failed to send SMS notifications',
        consultationId: consultation.id,
        error: error.message
      });
    }
  }

  /**
   * Manually trigger meeting link generation for a consultation
   * (for testing or manual override)
   */
  async forceGenerateMeetingLink(consultationId) {
    try {
      const { data: consultation, error } = await supabaseAdmin
        .from('consultations')
        .select(`
          *,
          users:user_id(id, display_name, email, phone),
          lawyers:lawyer_id(
            id,
            user_id,
            users:user_id(id, display_name, email, phone)
          )
        `)
        .eq('id', consultationId)
        .single();

      if (error || !consultation) {
        throw new Error('Consultation not found');
      }

      const result = await videoService.createMeetingForConsultation(consultationId);
      
      if (result.isNew) {
        await this.notifyUsers(consultation, result.meeting.meeting_link);
      }

      return result;
    } catch (error) {
      logger.error({
        message: 'Failed to force generate meeting link',
        consultationId,
        error: error.message
      });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new MeetingSchedulerService();
