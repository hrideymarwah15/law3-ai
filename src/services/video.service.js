const { google } = require('googleapis');
const logger = require('../config/logger');
const { ExternalServiceError } = require('../middleware/errorHandler');

class VideoService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Set credentials for API calls
   */
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Create a Google Meet meeting via Calendar API
   * @param {string} title - Meeting title
   * @param {Date} startTime - Meeting start time
   * @param {number} durationMinutes - Duration in minutes
   * @param {Array} attendees - Array of email addresses
   */
  async createMeeting(title, startTime, durationMinutes = 30, attendees = []) {
    try {
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

      const event = {
        summary: title,
        description: 'Legal consultation via Nyaay Saathi platform',
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        conferenceData: {
          createRequest: {
            requestId: `nyaay-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
        attendees: attendees.map(email => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1,
        sendUpdates: 'all',
      });

      const meetLink = response.data.conferenceData?.entryPoints?.find(
        ep => ep.entryPointType === 'video'
      )?.uri;

      logger.info({ 
        message: 'Google Meet created', 
        eventId: response.data.id,
        meetLink 
      });

      return {
        event_id: response.data.id,
        meeting_link: meetLink || response.data.hangoutLink,
        start_time: response.data.start.dateTime,
        end_time: response.data.end.dateTime,
      };
    } catch (error) {
      logger.error({ message: 'Failed to create Google Meet', error: error.message });
      throw new ExternalServiceError('Failed to create video meeting', 'google-meet');
    }
  }

  /**
   * Generate a simple meeting link (fallback when Calendar API is not configured)
   * Uses a placeholder URL format that can be replaced with actual meeting service
   */
  generateMeetingLink(consultationId) {
    // In production, this would integrate with your video solution
    // For MVP, return a placeholder that can be updated
    const meetingCode = consultationId.replace(/-/g, '').slice(0, 12);
    return `https://meet.nyaaysaathi.com/${meetingCode}`;
  }
}

module.exports = new VideoService();
