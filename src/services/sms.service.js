const twilio = require('twilio');
const logger = require('../config/logger');
const { ExternalServiceError } = require('../middleware/errorHandler');

class SMSService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
  }

  /**
   * Send SMS message
   * @param {string} to - Phone number in E.164 format
   * @param {string} message - SMS content
   */
  async sendSMS(to, message) {
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
      logger.error({ message: 'SMS send failed', error: error.message, to: to.slice(-4) });
      throw new ExternalServiceError('Failed to send SMS', 'twilio');
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
}

module.exports = new SMSService();
