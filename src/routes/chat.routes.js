/**
 * Chat Routes
 * REST API endpoints for the chat system
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');

const chatController = require('../controllers/chat.controller');
const { supabaseAuthMiddleware, verifiedLawyerMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const { rateLimiter } = require('../middleware/rateLimiter');

const {
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
} = require('../validators/chat.validators');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Allowed MIME types
    const allowedTypes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      // Archives
      'application/zip',
      'application/x-rar-compressed',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  },
});

// All routes require authentication
router.use(supabaseAuthMiddleware);

// ============================================
// Room Routes
// ============================================

/**
 * @route   POST /api/v1/chat/rooms
 * @desc    Get or create a chat room for a consultation
 * @access  Private (User/Lawyer)
 */
router.post(
  '/rooms',
  validate(getOrCreateRoomSchema),
  asyncHandler(chatController.getOrCreateRoom)
);

/**
 * @route   GET /api/v1/chat/rooms
 * @desc    Get user's chat rooms
 * @access  Private
 */
router.get(
  '/rooms',
  validate(getRoomsSchema),
  asyncHandler(chatController.getRooms)
);

/**
 * @route   GET /api/v1/chat/rooms/:room_id
 * @desc    Get a specific chat room
 * @access  Private (Room participants only)
 */
router.get(
  '/rooms/:room_id',
  validate(getRoomSchema),
  asyncHandler(chatController.getRoom)
);

/**
 * @route   PUT /api/v1/chat/rooms/:room_id/archive
 * @desc    Archive a chat room
 * @access  Private (Room participants only)
 */
router.put(
  '/rooms/:room_id/archive',
  validate(archiveRoomSchema),
  asyncHandler(chatController.archiveRoom)
);

// ============================================
// Message Routes
// ============================================

/**
 * @route   GET /api/v1/chat/rooms/:room_id/messages
 * @desc    Get messages for a room (with cursor pagination)
 * @access  Private (Room participants only)
 */
router.get(
  '/rooms/:room_id/messages',
  validate(getMessagesSchema),
  asyncHandler(chatController.getMessages)
);

/**
 * @route   POST /api/v1/chat/rooms/:room_id/messages
 * @desc    Send a text message
 * @access  Private (Room participants only)
 */
router.post(
  '/rooms/:room_id/messages',
  rateLimiter.message,
  validate(sendMessageSchema),
  asyncHandler(chatController.sendMessage)
);

/**
 * @route   PUT /api/v1/chat/messages/:message_id
 * @desc    Edit a message
 * @access  Private (Message sender only)
 */
router.put(
  '/messages/:message_id',
  validate(editMessageSchema),
  asyncHandler(chatController.editMessage)
);

/**
 * @route   DELETE /api/v1/chat/messages/:message_id
 * @desc    Delete a message
 * @access  Private (Message sender only)
 */
router.delete(
  '/messages/:message_id',
  validate(deleteMessageSchema),
  asyncHandler(chatController.deleteMessage)
);

// ============================================
// Read Receipt Routes
// ============================================

/**
 * @route   POST /api/v1/chat/rooms/:room_id/read
 * @desc    Mark messages as read
 * @access  Private (Room participants only)
 */
router.post(
  '/rooms/:room_id/read',
  validate(markAsReadSchema),
  asyncHandler(chatController.markAsRead)
);

// ============================================
// Typing Indicator Routes
// ============================================

/**
 * @route   POST /api/v1/chat/rooms/:room_id/typing
 * @desc    Update typing indicator
 * @access  Private (Room participants only)
 */
router.post(
  '/rooms/:room_id/typing',
  validate(updateTypingSchema),
  asyncHandler(chatController.updateTyping)
);

// ============================================
// Unread Count Route
// ============================================

/**
 * @route   GET /api/v1/chat/unread
 * @desc    Get total unread message count
 * @access  Private
 */
router.get(
  '/unread',
  asyncHandler(chatController.getUnreadCount)
);

// ============================================
// Search Routes
// ============================================

/**
 * @route   GET /api/v1/chat/rooms/:room_id/search
 * @desc    Search messages in a room
 * @access  Private (Room participants only)
 */
router.get(
  '/rooms/:room_id/search',
  validate(searchMessagesSchema),
  asyncHandler(chatController.searchMessages)
);

// ============================================
// Media Routes
// ============================================

/**
 * @route   GET /api/v1/chat/rooms/:room_id/media
 * @desc    Get media/attachments from a room
 * @access  Private (Room participants only)
 */
router.get(
  '/rooms/:room_id/media',
  validate(getRoomMediaSchema),
  asyncHandler(chatController.getRoomMedia)
);

/**
 * @route   POST /api/v1/chat/rooms/:room_id/upload
 * @desc    Upload a file (returns file info, doesn't send message)
 * @access  Private (Room participants only)
 */
router.post(
  '/rooms/:room_id/upload',
  validate(uploadFileSchema),
  upload.single('file'),
  asyncHandler(chatController.uploadFile)
);

/**
 * @route   POST /api/v1/chat/rooms/:room_id/file-message
 * @desc    Upload file and send as message in one request
 * @access  Private (Room participants only)
 */
router.post(
  '/rooms/:room_id/file-message',
  rateLimiter.message,
  upload.single('file'),
  asyncHandler(chatController.sendFileMessage)
);

// ============================================
// Consultation Link Routes
// ============================================

/**
 * @route   GET /api/v1/chat/consultation/:consultation_id
 * @desc    Get chat room by consultation ID
 * @access  Private (Consultation participants only)
 */
router.get(
  '/consultation/:consultation_id',
  validate(getRoomByConsultationSchema),
  asyncHandler(chatController.getRoomByConsultation)
);

module.exports = router;
