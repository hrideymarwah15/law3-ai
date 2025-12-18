const { supabaseAdmin } = require('../config/supabase');
const { cache } = require('../config/redis');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');
const logger = require('../config/logger');

class LawyerController {
  /**
   * GET /lawyers/search
   * Search and filter verified lawyers
   */
  async search(req, res, next) {
    try {
      const {
        specialization,
        city,
        min_price,
        max_price,
        min_rating,
        page = 1,
        limit = 10,
      } = req.query;

      // Try cache first
      const cacheKey = `lawyers:search:${JSON.stringify(req.query)}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({ success: true, ...cached, cached: true });
      }

      // Build query
      let query = supabaseAdmin
        .from('lawyers')
        .select(`
          id,
          user_id,
          specialization,
          experience_years,
          consultation_fee,
          profile_photo_url,
          bio,
          rating,
          total_reviews,
          is_available,
          users!inner(name, city)
        `, { count: 'exact' })
        .eq('is_verified', true);

      // Apply filters
      if (specialization) {
        query = query.eq('specialization', specialization);
      }
      if (city) {
        query = query.eq('users.city', city);
      }
      if (min_price) {
        query = query.gte('consultation_fee', min_price);
      }
      if (max_price) {
        query = query.lte('consultation_fee', max_price);
      }
      if (min_rating) {
        query = query.gte('rating', min_rating);
      }

      // Pagination
      const offset = (page - 1) * limit;
      query = query
        .order('rating', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        logger.error({ message: 'Lawyer search error', error: error.message });
        throw new Error('Failed to search lawyers');
      }

      // Transform data
      const lawyers = data.map(lawyer => ({
        id: lawyer.id,
        name: lawyer.users?.name,
        city: lawyer.users?.city,
        profile_photo_url: lawyer.profile_photo_url,
        specialization: lawyer.specialization,
        experience_years: lawyer.experience_years,
        consultation_fee: lawyer.consultation_fee,
        rating: parseFloat(lawyer.rating) || 0,
        total_reviews: lawyer.total_reviews,
        is_available: lawyer.is_available,
        bio: lawyer.bio,
      }));

      const result = {
        total: count,
        page,
        limit,
        lawyers,
      };

      // Cache for 5 minutes
      await cache.set(cacheKey, result, 300);

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /lawyers/:lawyer_id
   * Get lawyer profile details
   */
  async getProfile(req, res, next) {
    try {
      const { lawyer_id } = req.params;

      // Try cache
      const cacheKey = `lawyer:${lawyer_id}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json({ success: true, lawyer: cached, cached: true });
      }

      const { data: lawyer, error } = await supabaseAdmin
        .from('lawyers')
        .select(`
          *,
          users!inner(name, email, city, avatar_url)
        `)
        .eq('id', lawyer_id)
        .eq('is_verified', true)
        .single();

      if (error || !lawyer) {
        throw new NotFoundError('Lawyer not found');
      }

      // Fetch recent reviews
      const { data: reviews } = await supabaseAdmin
        .from('reviews')
        .select(`
          id,
          rating,
          review_text,
          created_at,
          users!inner(name)
        `)
        .eq('lawyer_id', lawyer_id)
        .order('created_at', { ascending: false })
        .limit(5);

      const result = {
        id: lawyer.id,
        name: lawyer.users?.name,
        email: lawyer.users?.email,
        city: lawyer.users?.city,
        profile_photo_url: lawyer.profile_photo_url || lawyer.users?.avatar_url,
        specialization: lawyer.specialization,
        experience_years: lawyer.experience_years,
        consultation_fee: lawyer.consultation_fee,
        bio: lawyer.bio,
        rating: parseFloat(lawyer.rating) || 0,
        total_reviews: lawyer.total_reviews,
        total_consultations: lawyer.total_consultations,
        is_available: lawyer.is_available,
        bar_council_number: lawyer.bar_council_number,
        reviews: reviews?.map(r => ({
          id: r.id,
          user_name: r.users?.name?.split(' ')[0] || 'Anonymous',
          rating: r.rating,
          review_text: r.review_text,
          created_at: r.created_at,
        })) || [],
      };

      // Cache for 15 minutes
      await cache.set(cacheKey, result, 900);

      res.json({ success: true, lawyer: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /lawyers/:lawyer_id/availability
   * Get lawyer's available time slots for a date
   */
  async getAvailability(req, res, next) {
    try {
      const { lawyer_id } = req.params;
      const { date } = req.query;

      // Get day of week from date as string
      const dateObj = new Date(date);
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayOfWeek = days[dateObj.getDay()];

      // Get lawyer's schedule for this day
      const { data: schedule, error: scheduleError } = await supabaseAdmin
        .from('lawyer_availability')
        .select('*')
        .eq('lawyer_id', lawyer_id)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true);

      if (scheduleError) {
        throw new Error('Failed to fetch availability');
      }

      if (!schedule || schedule.length === 0) {
        return res.json({
          success: true,
          date,
          day_of_week: dayOfWeek,
          available_slots: [],
          message: 'Lawyer is not available on this day',
        });
      }

      // Get existing bookings for this date
      const { data: bookings } = await supabaseAdmin
        .from('consultations')
        .select('booking_time')
        .eq('lawyer_id', lawyer_id)
        .eq('booking_date', date)
        .in('status', ['pending', 'confirmed']);

      const bookedTimes = new Set(bookings?.map(b => b.booking_time.slice(0, 5)) || []);

      // Generate 30-minute slots
      const slots = [];
      for (const slot of schedule) {
        const startParts = slot.start_time.split(':');
        const endParts = slot.end_time.split(':');
        
        let currentHour = parseInt(startParts[0]);
        let currentMinute = parseInt(startParts[1]);
        const endHour = parseInt(endParts[0]);
        const endMinute = parseInt(endParts[1]);

        while (
          currentHour < endHour ||
          (currentHour === endHour && currentMinute < endMinute)
        ) {
          const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          
          // Calculate end time (30 min later)
          let endSlotHour = currentMinute + 30 >= 60 ? currentHour + 1 : currentHour;
          let endSlotMinute = (currentMinute + 30) % 60;
          const endTime = `${String(endSlotHour).padStart(2, '0')}:${String(endSlotMinute).padStart(2, '0')}`;

          slots.push({
            start_time: startTime,
            end_time: endTime,
            is_available: !bookedTimes.has(startTime),
          });

          // Move to next slot
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentHour++;
            currentMinute = 0;
          }
        }
      }

      res.json({
        success: true,
        date,
        day_of_week: dayOfWeek,
        available_slots: slots,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /lawyers/availability
   * Set availability slot (for lawyers)
   */
  async setAvailability(req, res, next) {
    try {
      const { day_of_week, start_time, end_time, is_active } = req.body;
      const userId = req.user.id;

      // Get lawyer profile
      const { data: lawyer } = await supabaseAdmin
        .from('lawyers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!lawyer) {
        throw new NotFoundError('Lawyer profile not found');
      }

      // Upsert availability
      const { data, error } = await supabaseAdmin
        .from('lawyer_availability')
        .upsert({
          lawyer_id: lawyer.id,
          day_of_week,
          start_time,
          end_time,
          is_active,
        }, {
          onConflict: 'lawyer_id,day_of_week,start_time',
        })
        .select()
        .single();

      if (error) {
        throw new ValidationError(error.message);
      }

      res.json({
        success: true,
        message: 'Availability updated',
        availability: data,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LawyerController();
