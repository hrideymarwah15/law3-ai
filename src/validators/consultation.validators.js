const { z } = require('zod');
const {
  uuid,
  pagination,
  date,
  time,
  consultationStatus,
  sanitizedText,
} = require('./common.validators');

const bookConsultationSchema = {
  body: z.object({
    lawyer_id: uuid,
    booking_date: date.refine(
      (val) => new Date(val) >= new Date(new Date().toDateString()),
      'Booking date cannot be in the past'
    ),
    booking_time: time,
    problem_description: sanitizedText(1000, 10),
  }),
};

const confirmPaymentSchema = {
  params: z.object({
    consultation_id: uuid,
  }),
  body: z.object({
    razorpay_payment_id: z.string().min(1),
    razorpay_order_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  }),
};

const getConsultationsSchema = {
  query: z.object({
    status: consultationStatus.optional(),
    ...pagination.shape,
  }),
};

const getConsultationSchema = {
  params: z.object({
    consultation_id: uuid,
  }),
};

const cancelConsultationSchema = {
  params: z.object({
    consultation_id: uuid,
  }),
  body: z.object({
    reason: sanitizedText(500).optional(),
  }),
};

const completeConsultationSchema = {
  params: z.object({
    consultation_id: uuid,
  }),
  body: z.object({
    notes: sanitizedText(2000).optional(),
  }),
};

/**
 * Reschedule consultation
 * Allows user or lawyer to reschedule a confirmed consultation
 */
const rescheduleConsultationSchema = {
  params: z.object({
    consultation_id: uuid,
  }),
  body: z.object({
    new_date: date.refine(
      (val) => new Date(val) >= new Date(new Date().toDateString()),
      'New booking date cannot be in the past'
    ),
    new_time: time,
    reason: sanitizedText(500, 10),
  }),
};

/**
 * Get consultation details
 */
const getConsultationDetailsSchema = {
  params: z.object({
    consultation_id: uuid,
  }),
};

/**
 * Get reschedule history for a consultation
 */
const getRescheduleHistorySchema = {
  params: z.object({
    consultation_id: uuid,
  }),
};

/**
 * Lawyer's consultations filter
 */
const getLawyerConsultationsSchema = {
  query: z.object({
    status: consultationStatus.optional(),
    from_date: date.optional(),
    to_date: date.optional(),
    ...pagination.shape,
  }),
};

module.exports = {
  bookConsultationSchema,
  confirmPaymentSchema,
  getConsultationsSchema,
  getConsultationSchema,
  cancelConsultationSchema,
  completeConsultationSchema,
  rescheduleConsultationSchema,
  getConsultationDetailsSchema,
  getRescheduleHistorySchema,
  getLawyerConsultationsSchema,
};
