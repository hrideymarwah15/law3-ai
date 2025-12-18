/**
 * Chat Validators
 * Validation schemas for chat API endpoints
 */

const { z } = require('zod');

// ============================================
// Common validators
// ============================================

const uuidSchema = z.string().uuid('Invalid UUID format');

const paginationSchema = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
};

// ============================================
// Room validators
// ============================================

const getOrCreateRoomSchema = {
  body: z.object({
    consultation_id: uuidSchema,
  }),
};

const getRoomsSchema = {
  query: z.object({
    ...paginationSchema,
    status: z.enum(['active', 'archived', 'closed']).optional(),
  }),
};

const getRoomSchema = {
  params: z.object({
    room_id: uuidSchema,
  }),
};

// ============================================
// Message validators
// ============================================

const getMessagesSchema = {
  params: z.object({
    room_id: uuidSchema,
  }),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(50),
    before: uuidSchema.optional(),
    after: uuidSchema.optional(),
  }),
};

const sendMessageSchema = {
  params: z.object({
    room_id: uuidSchema,
  }),
  body: z.object({
    content: z
      .string()
      .min(1, 'Message content is required')
      .max(5000, 'Message content exceeds maximum length of 5000 characters'),
    message_type: z.enum(['text', 'file', 'image', 'document', 'system']).default('text'),
    reply_to_id: uuidSchema.optional().nullable(),
  }),
};

const editMessageSchema = {
  params: z.object({
    message_id: uuidSchema,
  }),
  body: z.object({
    content: z
      .string()
      .min(1, 'Message content is required')
      .max(5000, 'Message content exceeds maximum length of 5000 characters'),
  }),
};

const deleteMessageSchema = {
  params: z.object({
    message_id: uuidSchema,
  }),
  body: z.object({
    delete_for_all: z.boolean().default(false),
  }).optional(),
};

// ============================================
// Read receipts validators
// ============================================

const markAsReadSchema = {
  params: z.object({
    room_id: uuidSchema,
  }),
  body: z.object({
    up_to_message_id: uuidSchema.optional().nullable(),
  }).optional(),
};

// ============================================
// Typing validators
// ============================================

const updateTypingSchema = {
  params: z.object({
    room_id: uuidSchema,
  }),
  body: z.object({
    is_typing: z.boolean(),
  }),
};

// ============================================
// Search validators
// ============================================

const searchMessagesSchema = {
  params: z.object({
    room_id: uuidSchema,
  }),
  query: z.object({
    q: z.string().min(2, 'Search term must be at least 2 characters').max(100),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
};

// ============================================
// Media validators
// ============================================

const getRoomMediaSchema = {
  params: z.object({
    room_id: uuidSchema,
  }),
  query: z.object({
    ...paginationSchema,
    type: z.enum(['file', 'image', 'document']).optional(),
  }),
};

const uploadFileSchema = {
  params: z.object({
    room_id: uuidSchema,
  }),
};

const sendFileMessageSchema = {
  params: z.object({
    room_id: uuidSchema,
  }),
  body: z.object({
    reply_to_id: uuidSchema.optional().nullable(),
  }).optional(),
};

// ============================================
// Consultation validators
// ============================================

const getRoomByConsultationSchema = {
  params: z.object({
    consultation_id: uuidSchema,
  }),
};

// ============================================
// Archive validators
// ============================================

const archiveRoomSchema = {
  params: z.object({
    room_id: uuidSchema,
  }),
};

module.exports = {
  getOrCreateRoomSchema,
  getRoomsSchema,
  getRoomSchema,
  getMessagesSchema,
  sendMessageSchema,
  editMessageSchema,
  deleteMessageSchema,
  markAsReadSchema,
  updateTypingSchema,
  searchMessagesSchema,
  getRoomMediaSchema,
  uploadFileSchema,
  sendFileMessageSchema,
  getRoomByConsultationSchema,
  archiveRoomSchema,
};
