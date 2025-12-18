const twilio = require('twilio');
const logger = require('../config/logger');
const { ExternalServiceError } = require('../middleware/errorHandler');

class SMSService {
  constructor() {
    this.client = null;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    this.enabled = false;

    // Only initialize Twilio if credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      try {
        this.client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        this.enabled = true;
        logger.info({ message: 'SMS service initialized (Twilio)' });
      } catch (error) {
        logger.warn({ message: 'SMS service failed to initialize', error: error.message });
      }
    } else {
      logger.warn({ message: 'SMS service disabled - Twilio credentials not configured' });
    }
  }

  /**
   * Send SMS message
   * @param {string} to - Phone number in E.164 format
   * @param {string} message - SMS content
   */
  async sendSMS(to, message) {
    // Skip if SMS is not enabled
    if (!this.enabled || !this.client) {
      logger.debug({ message: 'SMS skipped - service not configured', to: to?.slice(-4) });
      return {
        success: true,
        skipped: true,
        reason: 'SMS service not configured',
      };
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to,
      });

      logger.info({ 
        message: 'SMS sent', 
        sid: result.sid, 
        to: to.slice(-4),
        status: result.status 
      });

      return {
        success: true,
        sid: result.sid,
        status: result.status,
      };
    } catch (error) {
      logger.error({ message: 'SMS send failed', error: error.message, to: to?.slice(-4) });
      // Don't throw - SMS failure shouldn't break the main flow
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send hearing reminder
   */
  async sendHearingReminder(phone, caseTitle, hearingDate, courtName) {
    const message = `Nyaay Saathi Reminder: Your hearing for "${caseTitle}" is scheduled for ${hearingDate} at ${courtName}. Please arrive on time with all documents.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send consultation reminder
   */
  async sendConsultationReminder(phone, lawyerName, date, time, meetingLink) {
    const message = `Nyaay Saathi: Your consultation with ${lawyerName} is scheduled for ${date} at ${time}. Join here: ${meetingLink}`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send booking confirmation
   */
  async sendBookingConfirmation(phone, lawyerName, date, time, amount) {
    const message = `Nyaay Saathi: Your consultation with ${lawyerName} is confirmed for ${date} at ${time}. Amount paid: ₹${amount}. You'll receive the meeting link before the consultation.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send cancellation notice
   */
  async sendCancellationNotice(phone, lawyerName, date, refundStatus) {
    const refundMsg = refundStatus === 'initiated' ? 'Refund has been initiated.' : '';
    const message = `Nyaay Saathi: Your consultation with ${lawyerName} on ${date} has been cancelled. ${refundMsg} Contact support for any queries.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send payment receipt
   */
  async sendPaymentReceipt(phone, amount, consultationId) {
    const message = `Nyaay Saathi: Payment of ₹${amount} received for consultation #${consultationId.slice(0, 8)}. Thank you for using Nyaay Saathi!`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send generic SMS (alias for sendSMS)
   */
  async sendGenericSMS(phone, message) {
    return this.sendSMS(phone, message);
  }

  /**
   * Send message (alias for sendSMS - used by meeting scheduler)
   */
  async sendMessage(phone, message) {
    return this.sendSMS(phone, message);
  }

  /**
   * Send lawyer approval notification
   */
  async sendLawyerApprovalNotice(phone, lawyerName) {
    const message = `Congratulations ${lawyerName}! Your lawyer registration on Nyaay Saathi has been approved. You can now start receiving consultation requests. Login to your dashboard to set your availability.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send lawyer rejection notification
   */
  async sendLawyerRejectionNotice(phone, lawyerName, reason) {
    const message = `Dear ${lawyerName}, your lawyer registration on Nyaay Saathi was not approved. Reason: ${reason}. Please contact support for more information.`;
    return this.sendSMS(phone, message);
  }

  /**
   * Send reschedule notification
   */
  async sendRescheduleNotice(phone, originalDate, newDate, newTime, reason) {
    const message = `Nyaay Saathi: Your consultation on ${originalDate} has been rescheduled to ${newDate} at ${newTime}. Reason: ${reason}`;
    return this.sendSMS(phone, message);
  }

  /**
   * Check if SMS service is configured
   */
  isConfigured() {
    return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
  }
}

module.exports = new SMSService();
