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
    problem_description: sanitizedText(1000).min(10, 'Please provide at least 10 characters'),
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

module.exports = {
  bookConsultationSchema,
  confirmPaymentSchema,
  getConsultationsSchema,
  getConsultationSchema,
  cancelConsultationSchema,
  completeConsultationSchema,
};
