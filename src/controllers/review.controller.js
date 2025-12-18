const { supabaseAdmin } = require('../config/supabase');
const { cache } = require('../config/redis');
const { NotFoundError, ValidationError, ConflictError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

class ReviewController {
  /**
   * POST /reviews/create
   * Submit a review for a completed consultation
   */
  async create(req, res, next) {
    try {
      const { consultation_id, rating, review_text } = req.body;
      const userId = req.user.id;

      // Check consultation exists and is completed
      const { data: consultation, error: consultationError } = await supabaseAdmin
        .from('consultations')
        .select('*, lawyers(id)')
        .eq('id', consultation_id)
        .eq('user_id', userId)
        .eq('status', 'completed')
        .single();

      if (consultationError || !consultation) {
        throw new NotFoundError('Completed consultation not found');
      }

      // Check if review already exists
      const { data: existingReview } = await supabaseAdmin
        .from('reviews')
        .select('id')
        .eq('consultation_id', consultation_id)
        .single();

      if (existingReview) {
        throw new ConflictError('Review already submitted for this consultation');
      }

      // Create review
      const { data: review, error: reviewError } = await supabaseAdmin
        .from('reviews')
        .insert({
          consultation_id,
          user_id: userId,
          lawyer_id: consultation.lawyers.id,
          rating,
          review_text,
        })
        .select()
        .single();

      if (reviewError) {
        throw new ValidationError(reviewError.message);
      }

      // Invalidate cache
      await cache.del(`lawyer:${consultation.lawyers.id}`);
      await cache.delPattern(`lawyers:search:*`);

      logger.info({ 
        message: 'Review created', 
        reviewId: review.id, 
        lawyerId: consultation.lawyers.id 
      });

      res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        review: {
          id: review.id,
          rating: review.rating,
          review_text: review.review_text,
          created_at: review.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /reviews/lawyer/:lawyer_id
   * Get all reviews for a lawyer
   */
  async getByLawyer(req, res, next) {
    try {
      const { lawyer_id } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      // Get lawyer's average rating
      const { data: lawyer } = await supabaseAdmin
        .from('lawyers')
        .select('rating, total_reviews')
        .eq('id', lawyer_id)
        .single();

      // Get reviews
      const { data: reviews, error, count } = await supabaseAdmin
        .from('reviews')
        .select(`
          id,
          rating,
          review_text,
          created_at,
          is_verified,
          users:user_id(first_name, display_name)
        `, { count: 'exact' })
        .eq('lawyer_id', lawyer_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        total: count,
        average_rating: parseFloat(lawyer?.rating) || 0,
        reviews: reviews.map(r => ({
          id: r.id,
          user_name: r.users?.first_name || r.users?.display_name || 'Anonymous',
          rating: r.rating,
          review_text: r.review_text,
          created_at: r.created_at,
          is_verified: r.is_verified,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReviewController();
