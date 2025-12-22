const { supabaseAdmin } = require('../config/supabase');
const chatbotService = require('../services/chatbot.service');
const { ValidationError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

class ChatbotController {
  /**
   * POST /chatbot/query
   * Send query to chatbot with automatic domain detection and lawyer recommendations
   */
  async query(req, res, next) {
    try {
      const { query, language = 'english', session_id, city = null } = req.body;
      const userId = req.user?.id || null;

      // Fetch conversation history if session exists
      let conversationHistory = [];
      if (session_id) {
        const { data: history } = await supabaseAdmin
          .from('chatbot_interactions')
          .select('query, response')
          .eq('session_id', session_id)
          .order('created_at', { ascending: true })
          .limit(10);

        if (history) {
          conversationHistory = history.flatMap(h => [
            { role: 'user', content: h.query },
            { role: 'assistant', content: h.response }
          ]);
        }
      }

      // Process query with Gemini and get lawyer recommendations
      const result = await chatbotService.processQuery(
        query,
        language,
        session_id,
        conversationHistory,
        { city }
      );

      // Log interaction with detected domain
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
          detected_domain: result.detected_domain?.primary || 'general',
          metadata: {
            domain: result.detected_domain,
            lawyers_shown: result.recommended_lawyers?.length || 0,
            city
          }
        });

      res.json({
        success: true,
        response: result.response,
        intent: result.intent,
        confidence: result.confidence,
        suggestions: result.suggestions,
        detected_domain: result.detected_domain,
        recommended_lawyers: result.recommended_lawyers,
        total_lawyers_found: result.total_lawyers_found
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

      // Also get lawyers for this case type
      const lawyers = await chatbotService.getRecommendedLawyers(case_type, {
        city,
        limit: 10
      });

      res.json({
        success: true,
        estimate,
        recommended_lawyers: lawyers,
        total_lawyers_found: lawyers.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /chatbot/history/:session_id
   * Get chat history for a session
   */
  async getHistory(req, res, next) {
    try {
      const { session_id } = req.params;
      const userId = req.user?.id;

      let query = supabaseAdmin
        .from('chatbot_interactions')
        .select('id, query, response, language, intent, detected_domain, created_at')
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

  /**
   * GET /chatbot/domains
   * Get all available legal domains
   */
  async getDomains(req, res, next) {
    try {
      const { language = 'english' } = req.query;
      const domains = chatbotService.getAllDomains();

      res.json({
        success: true,
        domains: domains.map(d => ({
          id: d.id,
          name: language === 'hindi' ? d.nameHindi : d.name,
          specialization: d.specialization
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /chatbot/lawyers/:domain
   * Get recommended lawyers for a specific domain
   */
  async getLawyersByDomain(req, res, next) {
    try {
      const { domain } = req.params;
      const { city, limit = 15, min_rating, max_fee, language } = req.query;

      const lawyers = await chatbotService.getRecommendedLawyers(domain, {
        city,
        limit: parseInt(limit),
        minRating: min_rating ? parseFloat(min_rating) : undefined,
        maxFee: max_fee ? parseInt(max_fee) : undefined,
        language
      });

      const domainInfo = chatbotService.getDomainInfo(domain);

      res.json({
        success: true,
        domain: {
          id: domain,
          name: domainInfo?.displayName || domain,
          nameHindi: domainInfo?.displayNameHindi || domain
        },
        lawyers,
        total: lawyers.length
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatbotController();
