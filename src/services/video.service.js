/**
 * Video Consultation Service
 * Handles video meeting creation using Jitsi Meet (free, no auth required)
 * 
 * Jitsi Meet is used because:
 * - Free and open-source
 * - No API keys required
 * - Works immediately without OAuth setup
 * - Supports video, audio, screen sharing, chat
 * - HIPAA compliant options available
 */

const crypto = require('crypto');
const logger = require('../config/logger');
const { supabaseAdmin } = require('../config/supabase');

class VideoService {
  constructor() {
    // Jitsi Meet public server (or your self-hosted instance)
    this.jitsiDomain = process.env.JITSI_DOMAIN || 'meet.jit.si';
    this.appName = 'NyaaySaathi';
  }

  /**
   * Generate a secure, unique room name for a consultation
   * @param {string} consultationId - The consultation UUID
   * @returns {string} - Unique room name
   */
  generateRoomName(consultationId) {
    // Create a unique room name: NyaaySaathi_{shortId}_{random}
    const shortId = consultationId.replace(/-/g, '').slice(0, 8);
    const randomPart = crypto.randomBytes(4).toString('hex');
    return `${this.appName}_${shortId}_${randomPart}`;
  }

  /**
   * Generate a Jitsi Meet link for a consultation
   * @param {string} consultationId - The consultation UUID
   * @param {object} options - Meeting options
   * @returns {object} - Meeting details with link
   */
  generateMeetingLink(consultationId, options = {}) {
    const roomName = this.generateRoomName(consultationId);
    
    // Build the meeting URL with optional parameters
    const params = new URLSearchParams();
    
    // Set display name if provided
    if (options.displayName) {
      params.set('userInfo.displayName', options.displayName);
    }
    
    // Start with audio/video muted for better UX
    if (options.startWithAudioMuted !== false) {
      params.set('config.startWithAudioMuted', 'false');
    }
    if (options.startWithVideoMuted !== false) {
      params.set('config.startWithVideoMuted', 'false');
    }
    
    // Set subject/room name display
    if (options.subject) {
      params.set('config.subject', options.subject);
    }

    const queryString = params.toString();
    const meetingLink = `https://${this.jitsiDomain}/${roomName}${queryString ? '?' + queryString : ''}`;

    logger.info({ 
      message: 'Meeting link generated',
      consultationId,
      roomName,
      domain: this.jitsiDomain
    });

    return {
      meeting_link: meetingLink,
      room_name: roomName,
      provider: 'jitsi',
      domain: this.jitsiDomain,
      created_at: new Date().toISOString()
    };
  }

  /**
   * Generate meeting link and update consultation in database
   * @param {string} consultationId - The consultation UUID
   * @returns {object} - Updated consultation with meeting link
   */
  async createMeetingForConsultation(consultationId) {
    try {
      // Get consultation details
      const { data: consultation, error: fetchError } = await supabaseAdmin
        .from('consultations')
        .select(`
          *,
          users:user_id(display_name, email),
          lawyers:lawyer_id(
            user_id,
            users:user_id(display_name, email)
          )
        `)
        .eq('id', consultationId)
        .single();

      if (fetchError || !consultation) {
        throw new Error('Consultation not found');
      }

      // Don't regenerate if link already exists
      if (consultation.meeting_link) {
        logger.info({ 
          message: 'Meeting link already exists',
          consultationId,
          existingLink: consultation.meeting_link
        });
        return { consultation, isNew: false };
      }

      // Generate meeting link
      const meetingDetails = this.generateMeetingLink(consultationId, {
        subject: `Legal Consultation - ${consultation.users?.display_name || 'Client'}`
      });

      // Update consultation with meeting link
      // Note: meeting_room_name and meeting_link_generated_at are optional columns
      const updateData = {
        meeting_link: meetingDetails.meeting_link,
        meeting_provider: 'jitsi',
        updated_at: new Date().toISOString()
      };

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('consultations')
        .update(updateData)
        .eq('id', consultationId)
        .select(`
          *,
          users:user_id(id, display_name, email, phone),
          lawyers:lawyer_id(
            id,
            user_id,
            users:user_id(id, display_name, email, phone)
          )
        `)
        .single();

      if (updateError) {
        throw new Error(`Failed to update consultation: ${updateError.message}`);
      }

      logger.info({
        message: 'Meeting created for consultation',
        consultationId,
        meetingLink: meetingDetails.meeting_link,
        userId: consultation.user_id,
        lawyerId: consultation.lawyer_id
      });

      return { 
        consultation: updated, 
        meeting: meetingDetails,
        isNew: true 
      };
    } catch (error) {
      logger.error({ 
        message: 'Failed to create meeting for consultation',
        consultationId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get upcoming video consultations that need meeting links
   * (consultations starting in next X minutes without meeting links)
   * @param {number} minutesBefore - Minutes before consultation to generate link
   * @returns {Array} - Consultations needing meeting links
   */
  async getConsultationsNeedingLinks(minutesBefore = 2) {
    try {
      const now = new Date();
      const cutoffTime = new Date(now.getTime() + minutesBefore * 60 * 1000);
      
      // Get today's date in YYYY-MM-DD format
      const today = now.toISOString().split('T')[0];
      
      // Calculate time window
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM
      const cutoffTimeStr = cutoffTime.toTimeString().slice(0, 5); // HH:MM

      const { data: consultations, error } = await supabaseAdmin
        .from('consultations')
        .select(`
          id,
          booking_date,
          booking_time,
          consultation_type,
          status,
          meeting_link,
          user_id,
          lawyer_id,
          users:user_id(display_name, email),
          lawyers:lawyer_id(
            user_id,
            users:user_id(display_name, email)
          )
        `)
        .eq('status', 'confirmed')
        .eq('consultation_type', 'video')
        .is('meeting_link', null)
        .eq('booking_date', today)
        .gte('booking_time', currentTime)
        .lte('booking_time', cutoffTimeStr);

      if (error) {
        throw error;
      }

      return consultations || [];
    } catch (error) {
      logger.error({ 
        message: 'Failed to get consultations needing links',
        error: error.message 
      });
      return [];
    }
  }

  /**
   * Process all consultations that need meeting links
   * This should be called by a scheduler every minute
   */
  async processUpcomingConsultations() {
    try {
      const consultations = await this.getConsultationsNeedingLinks(2);
      
      logger.info({
        message: 'Processing upcoming consultations',
        count: consultations.length
      });

      const results = [];
      for (const consultation of consultations) {
        try {
          const result = await this.createMeetingForConsultation(consultation.id);
          results.push({ 
            consultationId: consultation.id, 
            success: true,
            meetingLink: result.meeting?.meeting_link
          });
        } catch (err) {
          results.push({ 
            consultationId: consultation.id, 
            success: false, 
            error: err.message 
          });
        }
      }

      return results;
    } catch (error) {
      logger.error({ 
        message: 'Failed to process upcoming consultations',
        error: error.message 
      });
      return [];
    }
  }

  /**
   * Get meeting info for a consultation
   * @param {string} consultationId - The consultation UUID
   */
  async getMeetingInfo(consultationId) {
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .select('meeting_link, meeting_provider, meeting_room_name, meeting_link_generated_at')
      .eq('id', consultationId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Check if a meeting link is valid/active
   * For Jitsi, links are always valid as rooms are created on-demand
   */
  isLinkValid(meetingLink) {
    if (!meetingLink) return false;
    return meetingLink.includes(this.jitsiDomain) || meetingLink.includes('meet.jit.si');
  }
}

module.exports = new VideoService();
