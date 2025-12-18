const { supabaseAdmin } = require('../config/supabase');
const { NotFoundError, ValidationError, ForbiddenError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

class CaseController {
  /**
   * POST /cases/create
   * Add a new case manually
   */
  async create(req, res, next) {
    try {
      const {
        case_title,
        case_number,
        court_name,
        case_type,
        next_hearing_date,
        lawyer_name,
        notes,
      } = req.body;
      const userId = req.user.id;

      const { data: newCase, error } = await supabaseAdmin
        .from('cases')
        .insert({
          user_id: userId,
          case_title,
          case_number,
          court_name,
          case_type,
          next_hearing_date,
          lawyer_name,
          notes,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        throw new ValidationError(error.message);
      }

      logger.info({ message: 'Case created', caseId: newCase.id, userId });

      res.status(201).json({
        success: true,
        message: 'Case added successfully',
        case: newCase,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cases/my-cases
   * Get all cases of logged-in user
   */
  async getMyCases(req, res, next) {
    try {
      const { status, case_type, sort = 'next_hearing_date', page = 1, limit = 10 } = req.query;
      const userId = req.user.id;
      const offset = (page - 1) * limit;

      let query = supabaseAdmin
        .from('cases')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (status) {
        query = query.eq('status', status);
      }
      if (case_type) {
        query = query.eq('case_type', case_type);
      }

      // Sort
      if (sort === 'next_hearing_date') {
        query = query.order('next_hearing_date', { ascending: true, nullsFirst: false });
      } else if (sort === 'created_at') {
        query = query.order('created_at', { ascending: false });
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        total: count,
        page,
        limit,
        cases: data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /cases/:case_id
   * Get a specific case
   */
  async getById(req, res, next) {
    try {
      const { case_id } = req.params;
      const userId = req.user.id;

      const { data: caseData, error } = await supabaseAdmin
        .from('cases')
        .select('*')
        .eq('id', case_id)
        .eq('user_id', userId)
        .single();

      if (error || !caseData) {
        throw new NotFoundError('Case not found');
      }

      // Also get reminders for this case
      const { data: reminders } = await supabaseAdmin
        .from('reminders')
        .select('*')
        .eq('case_id', case_id)
        .order('reminder_date', { ascending: true });

      res.json({
        success: true,
        case: {
          ...caseData,
          reminders: reminders || [],
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /cases/:case_id
   * Update case details
   */
  async update(req, res, next) {
    try {
      const { case_id } = req.params;
      const userId = req.user.id;
      const {
        case_title,
        case_number,
        court_name,
        case_type,
        next_hearing_date,
        lawyer_name,
        status,
        notes,
      } = req.body;

      // Verify ownership
      const { data: existingCase } = await supabaseAdmin
        .from('cases')
        .select('user_id')
        .eq('id', case_id)
        .single();

      if (!existingCase || existingCase.user_id !== userId) {
        throw new ForbiddenError('You do not have permission to update this case');
      }

      const updateData = { updated_at: new Date().toISOString() };
      if (case_title !== undefined) updateData.case_title = case_title;
      if (case_number !== undefined) updateData.case_number = case_number;
      if (court_name !== undefined) updateData.court_name = court_name;
      if (case_type !== undefined) updateData.case_type = case_type;
      if (next_hearing_date !== undefined) updateData.next_hearing_date = next_hearing_date;
      if (lawyer_name !== undefined) updateData.lawyer_name = lawyer_name;
      if (status !== undefined) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;

      const { data: updated, error } = await supabaseAdmin
        .from('cases')
        .update(updateData)
        .eq('id', case_id)
        .select()
        .single();

      if (error) {
        throw new ValidationError(error.message);
      }

      logger.info({ message: 'Case updated', caseId: case_id });

      res.json({
        success: true,
        message: 'Case updated successfully',
        case: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /cases/:case_id
   * Delete a case
   */
  async delete(req, res, next) {
    try {
      const { case_id } = req.params;
      const userId = req.user.id;

      // Verify ownership
      const { data: existingCase } = await supabaseAdmin
        .from('cases')
        .select('user_id')
        .eq('id', case_id)
        .single();

      if (!existingCase || existingCase.user_id !== userId) {
        throw new ForbiddenError('You do not have permission to delete this case');
      }

      // Delete related reminders first
      await supabaseAdmin
        .from('reminders')
        .delete()
        .eq('case_id', case_id);

      // Delete case
      const { error } = await supabaseAdmin
        .from('cases')
        .delete()
        .eq('id', case_id);

      if (error) {
        throw error;
      }

      logger.info({ message: 'Case deleted', caseId: case_id });

      res.json({
        success: true,
        message: 'Case deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CaseController();
