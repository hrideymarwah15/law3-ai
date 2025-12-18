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

module.exports = {
  searchLawyersSchema,
  getLawyerSchema,
  getAvailabilitySchema,
  updateAvailabilitySchema,
  createLawyerProfileSchema,
  updateLawyerProfileSchema,
};
