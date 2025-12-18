const { supabaseAdmin } = require('../config/supabase');
const { NotFoundError, ValidationError, ForbiddenError } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const smsService = require('../services/sms.service');

class ReminderController {
  /**
   * POST /reminders/create
   * Add a new reminder for a case
   */
  async create(req, res, next) {
    try {
      const { case_id, reminder_type, reminder_date, message, send_sms } = req.body;
      const userId = req.user.id;

      // Verify case ownership
      const { data: caseData } = await supabaseAdmin
        .from('cases')
        .select('user_id, case_title')
        .eq('id', case_id)
        .single();

      if (!caseData || caseData.user_id !== userId) {
        throw new ForbiddenError('You can only create reminders for your own cases');
      }

      const { data: reminder, error } = await supabaseAdmin
        .from('reminders')
        .insert({
          user_id: userId,
          case_id,
          reminder_type,
          reminder_date,
          message: message || `Reminder for ${caseData.case_title}`,
          send_sms: send_sms || false,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        throw new ValidationError(error.message);
      }

      logger.info({ message: 'Reminder created', reminderId: reminder.id });

      res.status(201).json({
        success: true,
        message: 'Reminder created successfully',
        reminder,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reminders/my-reminders
   * Get all reminders of logged-in user
   */
  async getMyReminders(req, res, next) {
    try {
      const { status, from_date, to_date, page = 1, limit = 20 } = req.query;
      const userId = req.user.id;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('reminders')
        .select(
          `
          *,
          case:cases(id, case_title, case_number, court_name)
        `,
          { count: 'exact' }
        )
        .eq('user_id', userId);

      if (status) {
        query = query.eq('status', status);
      }
      if (from_date) {
        query = query.gte('reminder_date', from_date);
      }
      if (to_date) {
        query = query.lte('reminder_date', to_date);
      }

      query = query
        .order('reminder_date', { ascending: true })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        total: count,
        page,
        limit,
        reminders: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reminders/upcoming
   * Get upcoming reminders within next N days
   */
  async getUpcoming(req, res, next) {
    try {
      const { days = 7 } = req.query;
      const userId = req.user.id;

      const now = new Date();
      const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const { data: reminders, error } = await supabaseAdmin
        .from('reminders')
        .select(
          `
          *,
          case:cases(id, case_title, case_number, court_name, next_hearing_date)
        `
        )
        .eq('user_id', userId)
        .eq('status', 'pending')
        .gte('reminder_date', now.toISOString())
        .lte('reminder_date', endDate.toISOString())
        .order('reminder_date', { ascending: true });

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        reminders,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /reminders/:reminder_id
   * Update a reminder
   */
  async update(req, res, next) {
    try {
      const { reminder_id } = req.params;
      const userId = req.user.id;
      const { reminder_date, message, send_sms, status } = req.body;

      // Verify ownership
      const { data: existing } = await supabaseAdmin
        .from('reminders')
        .select('user_id')
        .eq('id', reminder_id)
        .single();

      if (!existing || existing.user_id !== userId) {
        throw new ForbiddenError('You do not have permission to update this reminder');
      }

      const updateData = { updated_at: new Date().toISOString() };
      if (reminder_date !== undefined) updateData.reminder_date = reminder_date;
      if (message !== undefined) updateData.message = message;
      if (send_sms !== undefined) updateData.send_sms = send_sms;
      if (status !== undefined) updateData.status = status;

      const { data: updated, error } = await supabaseAdmin
        .from('reminders')
        .update(updateData)
        .eq('id', reminder_id)
        .select()
        .single();

      if (error) {
        throw new ValidationError(error.message);
      }

      res.json({
        success: true,
        message: 'Reminder updated successfully',
        reminder: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /reminders/:reminder_id
   * Delete a reminder
   */
  async delete(req, res, next) {
    try {
      const { reminder_id } = req.params;
      const userId = req.user.id;

      // Verify ownership
      const { data: existing } = await supabaseAdmin
        .from('reminders')
        .select('user_id')
        .eq('id', reminder_id)
        .single();

      if (!existing || existing.user_id !== userId) {
        throw new ForbiddenError('You do not have permission to delete this reminder');
      }

      const { error } = await supabaseAdmin
        .from('reminders')
        .delete()
        .eq('id', reminder_id);

      if (error) {
        throw error;
      }

      logger.info({ message: 'Reminder deleted', reminderId: reminder_id });

      res.json({
        success: true,
        message: 'Reminder deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /reminders/:reminder_id/mark-sent
   * Mark a reminder as sent (for admin/cron use)
   */
  async markAsSent(req, res, next) {
    try {
      const { reminder_id } = req.params;

      const { data: updated, error } = await supabaseAdmin
        .from('reminders')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', reminder_id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        reminder: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /reminders/process-due
   * Process and send due reminders (for cron/queue worker)
   * This should be called by a cron job or queue worker
   */
  async processDueReminders(req, res, next) {
    try {
      const now = new Date();

      // Get pending reminders that are due
      const { data: dueReminders, error } = await supabaseAdmin
        .from('reminders')
        .select(
          `
          *,
          case:cases(case_title, court_name, next_hearing_date),
          user:users(phone, name)
        `
        )
        .eq('status', 'pending')
        .eq('send_sms', true)
        .lte('reminder_date', now.toISOString())
        .limit(50);

      if (error) {
        throw error;
      }

      const results = {
        processed: 0,
        sent: 0,
        failed: 0,
        errors: [],
      };

      for (const reminder of dueReminders || []) {
        results.processed++;

        try {
          if (reminder.user?.phone) {
            const smsMessage =
              reminder.case?.case_title
                ? `🔔 Reminder: ${reminder.message}\nCase: ${reminder.case.case_title}\nCourt: ${reminder.case.court_name || 'N/A'}`
                : `🔔 ${reminder.message}`;

            await smsService.sendSMS(reminder.user.phone, smsMessage);

            // Mark as sent
            await supabaseAdmin
              .from('reminders')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', reminder.id);

            results.sent++;
          } else {
            // No phone, just mark as sent
            await supabaseAdmin
              .from('reminders')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('id', reminder.id);
          }
        } catch (err) {
          results.failed++;
          results.errors.push({ reminderId: reminder.id, error: err.message });
          logger.error({ message: 'Failed to send reminder', reminderId: reminder.id, error: err.message });
        }
      }

      logger.info({ message: 'Due reminders processed', results });

      res.json({
        success: true,
        results,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReminderController();
