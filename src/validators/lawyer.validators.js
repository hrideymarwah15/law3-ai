const { z } = require('zod');
const {
  uuid,
  pagination,
  specialization,
  date,
  time,
  dayOfWeek,
  sanitizedString,
  sanitizedText,
  email,
  phone,
} = require('./common.validators');

const searchLawyersSchema = {
  query: z.object({
    specialization: specialization.optional(),
    city: z.string().max(50).optional(),
    min_price: z.coerce.number().min(0).optional(),
    max_price: z.coerce.number().min(0).optional(),
    min_rating: z.coerce.number().min(1).max(5).optional(),
    ...pagination.shape,
  }),
};

const getLawyerSchema = {
  params: z.object({
    lawyer_id: uuid,
  }),
};

const getAvailabilitySchema = {
  params: z.object({
    lawyer_id: uuid,
  }),
  query: z.object({
    date: date,
  }),
};

const updateAvailabilitySchema = {
  body: z.object({
    day_of_week: dayOfWeek,
    start_time: time,
    end_time: time,
    is_active: z.boolean().default(true),
  }).refine(
    (data) => data.start_time < data.end_time,
    { message: 'End time must be after start time' }
  ),
};

const createLawyerProfileSchema = {
  body: z.object({
    bar_council_number: z.string().min(5).max(50),
    specialization: specialization,
    experience_years: z.number().min(0).max(60),
    consultation_fee: z.number().min(100).max(50000),
    bio: sanitizedText(500).optional(),
    city: sanitizedString(50),
  }),
};

const updateLawyerProfileSchema = {
  body: z.object({
    specialization: specialization.optional(),
    experience_years: z.number().min(0).max(60).optional(),
    consultation_fee: z.number().min(100).max(50000).optional(),
    bio: sanitizedText(500).optional(),
    is_available: z.boolean().optional(),
  }),
};

/**
 * Lawyer self-registration request
 * Complete registration flow for becoming a lawyer
 */
const lawyerRegistrationSchema = {
  body: z.object({
    // Required Professional Info
    bar_council_number: z.string()
      .min(5, 'Bar council number must be at least 5 characters')
      .max(50)
      .regex(/^[A-Z0-9/-]+$/i, 'Invalid bar council number format'),
    bar_council_state: z.string().min(2).max(100),
    bar_council_enrollment_date: date.optional(),
    license_number: z.string().max(100).optional(),
    
    // Specialization
    specialization: specialization,
    specializations: z.array(specialization).max(5).optional(),
    experience_years: z.number().min(0).max(70),
    
    // Profile Info
    bio: sanitizedText(2000, 50),
    headline: sanitizedString(200).optional(),
    
    // Consultation Settings
    consultation_fee: z.number().min(100).max(100000),
    consultation_duration: z.number().min(15).max(120).optional().default(30),
    
    // Office Info (required)
    office_name: sanitizedString(200).optional(),
    office_address: sanitizedText(500).optional(),
    office_city: sanitizedString(100),
    office_state: sanitizedString(100),
    office_pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits').optional(),
    office_phone: z.string().regex(/^\+?[1-9]\d{9,14}$/).optional(),
    office_email: z.string().email().max(255).optional(),
    
    // Education (array of education objects)
    education: z.array(z.object({
      degree: z.string().min(2).max(100),
      institution: z.string().min(2).max(200),
      year: z.number().min(1950).max(new Date().getFullYear()),
      grade: z.string().max(50).optional(),
    })).min(1, 'At least one education entry is required').max(10),
    
    // Certifications
    certifications: z.array(z.object({
      name: z.string().min(2).max(200),
      issuer: z.string().min(2).max(200),
      year: z.number().min(1950).max(new Date().getFullYear()),
      valid_until: date.optional(),
    })).max(20).optional(),
    
    // Languages & Practice
    languages_spoken: z.array(z.string().min(2).max(50)).min(1).max(10).default(['English']),
    practice_areas: z.array(z.string().min(2).max(100)).min(1).max(20),
    courts_practiced: z.array(z.string().min(2).max(200)).max(20).optional(),
    
    // Document URLs (uploaded separately)
    bar_council_certificate_url: z.string().url().max(500),
    id_proof_type: z.enum(['aadhaar', 'pan', 'passport', 'voter_id', 'driving_license']),
    id_proof_url: z.string().url().max(500),
    address_proof_url: z.string().url().max(500).optional(),
    profile_photo_url: z.string().url().max(500).optional(),
    additional_documents: z.array(z.object({
      name: z.string().max(100),
      url: z.string().url().max(500),
      type: z.string().max(50),
    })).max(10).optional(),
  }),
};

/**
 * Update registration request (for resubmission)
 */
const updateRegistrationSchema = {
  params: z.object({
    request_id: uuid,
  }),
  body: lawyerRegistrationSchema.body.partial().extend({
    // Must include at least one field
  }).refine(
    data => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' }
  ),
};

/**
 * Get registration status
 */
const getRegistrationStatusSchema = {
  // Uses authenticated user, no params needed
};

/**
 * Lawyer profile self-update
 * For verified lawyers to update their own profile
 */
const selfUpdateProfileSchema = {
  body: z.object({
    // Editable fields
    bio: sanitizedText(2000).optional(),
    headline: sanitizedString(200).optional(),
    
    // Consultation settings
    consultation_fee: z.number().min(100).max(100000).optional(),
    consultation_duration: z.number().min(15).max(120).optional(),
    followup_fee: z.number().min(0).max(100000).optional(),
    
    // Availability settings
    is_available: z.boolean().optional(),
    is_accepting_new_clients: z.boolean().optional(),
    max_daily_consultations: z.number().min(1).max(50).optional(),
    advance_booking_days: z.number().min(1).max(90).optional(),
    cancellation_hours: z.number().min(1).max(168).optional(),
    buffer_time: z.number().min(0).max(60).optional(),
    
    // Contact info
    office_phone: z.string().regex(/^\+?[1-9]\d{9,14}$/).optional(),
    office_email: z.string().email().max(255).optional(),
    website_url: z.string().url().max(500).optional(),
    linkedin_url: z.string().url().max(500).optional(),
    
    // Office address
    office_name: sanitizedString(200).optional(),
    office_address: sanitizedText(500).optional(),
    office_city: sanitizedString(100).optional(),
    office_state: sanitizedString(100).optional(),
    office_pincode: z.string().regex(/^\d{6}$/).optional(),
    
    // Practice info (can add, not remove verified items)
    specializations: z.array(specialization).max(5).optional(),
    practice_areas: z.array(z.string().min(2).max(100)).max(20).optional(),
    courts_practiced: z.array(z.string().min(2).max(200)).max(20).optional(),
    languages_spoken: z.array(z.string().min(2).max(50)).max(10).optional(),
    
    // Profile photo
    profile_photo_url: z.string().url().max(500).optional(),
    
    // Consultation types
    accepts_video: z.boolean().optional(),
    accepts_audio: z.boolean().optional(),
    accepts_in_person: z.boolean().optional(),
  }),
};

/**
 * Bulk availability update
 * Set availability for multiple days at once
 */
const bulkAvailabilitySchema = {
  body: z.object({
    slots: z.array(z.object({
      day_of_week: dayOfWeek,
      start_time: time,
      end_time: time,
      is_active: z.boolean().default(true),
    })).min(1).max(35), // Max 5 slots per day * 7 days
    replace_existing: z.boolean().optional().default(false),
  }).refine(
    data => data.slots.every(s => s.start_time < s.end_time),
    { message: 'End time must be after start time for all slots' }
  ),
};

/**
 * Set unavailability (vacation, holidays)
 */
const setUnavailabilitySchema = {
  body: z.object({
    unavailable_dates: z.array(z.object({
      date: date,
      start_time: time.optional(),
      end_time: time.optional(),
      reason: sanitizedString(200).optional(),
    })).min(1).max(30),
  }).refine(
    data => data.unavailable_dates.every(d => 
      (!d.start_time && !d.end_time) || (d.start_time && d.end_time && d.start_time < d.end_time)
    ),
    { message: 'If specifying times, end time must be after start time' }
  ),
};

/**
 * Get lawyer's own consultations
 */
const getMyLawyerConsultationsSchema = {
  query: z.object({
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']).optional(),
    from_date: date.optional(),
    to_date: date.optional(),
    ...pagination.shape,
  }),
};

module.exports = {
  searchLawyersSchema,
  getLawyerSchema,
  getAvailabilitySchema,
  updateAvailabilitySchema,
  createLawyerProfileSchema,
  updateLawyerProfileSchema,
  lawyerRegistrationSchema,
  updateRegistrationSchema,
  getRegistrationStatusSchema,
  selfUpdateProfileSchema,
  bulkAvailabilitySchema,
  setUnavailabilitySchema,
  getMyLawyerConsultationsSchema,
};
