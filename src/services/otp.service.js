/**
 * OTP Service
 * Handles OTP generation, storage, verification for phone-based authentication
 */

const { supabaseAdmin } = require('../config/supabase');
const smsService = require('./sms.service');
const logger = require('../config/logger');

class OtpService {
  constructor() {
    this.OTP_LENGTH = 6;
    this.OTP_EXPIRY_MINUTES = 10;
    this.MAX_ATTEMPTS = 3;
    this.RESEND_COOLDOWN_SECONDS = 60;
  }

  /**
   * Generate a random numeric OTP
   */
  generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send OTP to phone number
   * @param {string} phone - Phone number with country code
   * @param {string} purpose - Purpose: 'login', 'signup', 'reset_password', 'verify_phone'
   */
  async sendOtp(phone, purpose = 'login') {
    try {
      // Check for recent OTP (cooldown)
      const { data: recentOtp } = await supabaseAdmin
        .from('otps')
        .select('created_at')
        .eq('phone', phone)
        .eq('purpose', purpose)
        .eq('verified', false)
        .gte('created_at', new Date(Date.now() - this.RESEND_COOLDOWN_SECONDS * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (recentOtp) {
        const waitTime = Math.ceil(
          (this.RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - new Date(recentOtp.created_at).getTime())) / 1000
        );
        return {
          success: false,
          error: `Please wait ${waitTime} seconds before requesting another OTP`,
          wait_seconds: waitTime,
        };
      }

      // Invalidate previous OTPs for this phone and purpose
      await supabaseAdmin
        .from('otps')
        .delete()
        .eq('phone', phone)
        .eq('purpose', purpose)
        .eq('verified', false);

      // Generate new OTP
      const otpCode = this.generateOtp();
      const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      // Store OTP in database
      const { error: insertError } = await supabaseAdmin
        .from('otps')
        .insert({
          phone,
          otp_code: otpCode,
          purpose,
          expires_at: expiresAt.toISOString(),
          verified: false,
          attempts: 0,
        });

      if (insertError) {
        logger.error({ message: 'Failed to store OTP', error: insertError.message, phone });
        throw new Error('Failed to generate OTP');
      }

      // Send OTP via SMS
      const purposeMessages = {
        login: 'Your Nyaay Saathi login OTP is',
        signup: 'Your Nyaay Saathi registration OTP is',
        reset_password: 'Your password reset OTP is',
        verify_phone: 'Your phone verification OTP is',
      };

      const message = `${purposeMessages[purpose] || 'Your OTP is'}: ${otpCode}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes. Do not share this code.`;

      const smsResult = await smsService.sendSms(phone, message);

      if (!smsResult.success) {
        logger.error({ message: 'Failed to send OTP SMS', phone, error: smsResult.error });
        // Delete the OTP if SMS failed
        await supabaseAdmin.from('otps').delete().eq('phone', phone).eq('otp_code', otpCode);
        throw new Error('Failed to send OTP');
      }

      logger.info({ 
        message: 'OTP sent successfully', 
        phone: phone.slice(-4), 
        purpose,
        messageId: smsResult.messageId 
      });

      return {
        success: true,
        message: 'OTP sent successfully',
        expires_in_minutes: this.OTP_EXPIRY_MINUTES,
      };
    } catch (error) {
      logger.error({ message: 'OTP send error', error: error.message, phone });
      throw error;
    }
  }

  /**
   * Verify OTP
   * @param {string} phone - Phone number
   * @param {string} otpCode - OTP code to verify
   * @param {string} purpose - Purpose of OTP
   */
  async verifyOtp(phone, otpCode, purpose = 'login') {
    try {
      // Find the OTP record
      const { data: otpRecord, error: fetchError } = await supabaseAdmin
        .from('otps')
        .select('*')
        .eq('phone', phone)
        .eq('purpose', purpose)
        .eq('verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !otpRecord) {
        return {
          success: false,
          error: 'No OTP found. Please request a new one.',
        };
      }

      // Check if expired
      if (new Date(otpRecord.expires_at) < new Date()) {
        await supabaseAdmin.from('otps').delete().eq('id', otpRecord.id);
        return {
          success: false,
          error: 'OTP has expired. Please request a new one.',
        };
      }

      // Check attempts
      if (otpRecord.attempts >= this.MAX_ATTEMPTS) {
        await supabaseAdmin.from('otps').delete().eq('id', otpRecord.id);
        return {
          success: false,
          error: 'Too many incorrect attempts. Please request a new OTP.',
        };
      }

      // Verify OTP
      if (otpRecord.otp_code !== otpCode) {
        // Increment attempts
        await supabaseAdmin
          .from('otps')
          .update({ attempts: otpRecord.attempts + 1 })
          .eq('id', otpRecord.id);

        const remainingAttempts = this.MAX_ATTEMPTS - otpRecord.attempts - 1;
        return {
          success: false,
          error: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
          remaining_attempts: remainingAttempts,
        };
      }

      // OTP is valid - mark as verified
      await supabaseAdmin
        .from('otps')
        .update({ verified: true })
        .eq('id', otpRecord.id);

      logger.info({ 
        message: 'OTP verified successfully', 
        phone: phone.slice(-4), 
        purpose 
      });

      return {
        success: true,
        message: 'OTP verified successfully',
      };
    } catch (error) {
      logger.error({ message: 'OTP verification error', error: error.message, phone });
      throw error;
    }
  }

  /**
   * Clean up expired OTPs (called by cron job)
   */
  async cleanupExpiredOtps() {
    try {
      const { data, error } = await supabaseAdmin
        .from('otps')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        logger.error({ message: 'Failed to cleanup expired OTPs', error: error.message });
        return { success: false, error: error.message };
      }

      const deletedCount = data?.length || 0;
      if (deletedCount > 0) {
        logger.info({ message: 'Cleaned up expired OTPs', count: deletedCount });
      }

      return { success: true, deleted: deletedCount };
    } catch (error) {
      logger.error({ message: 'OTP cleanup error', error: error.message });
      throw error;
    }
  }
}

module.exports = new OtpService();
