const { supabaseAdmin } = require('../config/supabase');
const chatbotService = require('../services/chatbot.service');
const { ValidationError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

class ChatbotController {
  /**
   * POST /chatbot/query
   * Send query to chatbot
   */
  async query(req, res, next) {
    try {
      const { query, language = 'english', session_id } = req.body;
      const userId = req.user?.id || null;

      // Process query with Gemini
      const result = await chatbotService.processQuery(
        query,
        language,
        session_id,
        [] // Conversation history can be fetched from DB if needed
      );

      // Log interaction
      await supabaseAdmin
        .from('chatbot_interactions')
        .insert({
          user_id: userId,
          session_id,
          query,
          response: result.response,
          language,
          intent: result.intent,
          confidence_score: result.confidence,
        });

      res.json({
        success: true,
        response: result.response,
        intent: result.intent,
        confidence: result.confidence,
        suggestions: result.suggestions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /chatbot/cost-estimate
   * Calculate legal cost estimate
   */
  async costEstimate(req, res, next) {
    try {
      const { case_type, city } = req.body;

      const estimate = chatbotService.calculateCostEstimate(case_type, city);

      res.json({
        success: true,
        estimate,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /chatbot/history
   * Get chat history for a session
   */
  async getHistory(req, res, next) {
    try {
      const { session_id } = req.query;
      const userId = req.user?.id;

      let query = supabaseAdmin
        .from('chatbot_interactions')
        .select('id, query, response, language, intent, created_at')
        .eq('session_id', session_id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        history: data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatbotController();
