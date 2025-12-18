/**
 * Chat Controller
 * HTTP endpoints for the chat system
 */

const chatService = require('../services/chat.service');
const logger = require('../config/logger');

class ChatController {
  /**
   * POST /api/v1/chat/rooms
   * Get or create a chat room for a consultation
   */
  async getOrCreateRoom(req, res, next) {
    try {
      const { consultation_id } = req.body;
      const userId = req.user.id;

      const room = await chatService.getOrCreateRoom(consultation_id, userId);

      res.status(200).json({
        success: true,
        room,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chat/rooms
   * Get user's chat rooms
   */
  async getRooms(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status } = req.query;

      const result = await chatService.getUserRooms(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chat/rooms/:room_id
   * Get a specific chat room
   */
  async getRoom(req, res, next) {
    try {
      const { room_id } = req.params;
      const userId = req.user.id;

      const room = await chatService.getRoom(room_id, userId);

      res.status(200).json({
        success: true,
        room,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chat/rooms/:room_id/messages
   * Get messages for a room
   */
  async getMessages(req, res, next) {
    try {
      const { room_id } = req.params;
      const { limit = 50, before, after } = req.query;
      const userId = req.user.id;

      const messages = await chatService.getMessages(room_id, userId, {
        limit: parseInt(limit),
        before,
        after,
      });

      res.status(200).json({
        success: true,
        messages,
        count: messages.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/rooms/:room_id/messages
   * Send a message
   */
  async sendMessage(req, res, next) {
    try {
      const { room_id } = req.params;
      const { content, message_type = 'text', reply_to_id } = req.body;
      const userId = req.user.id;

      const message = await chatService.sendMessage(room_id, userId, {
        content,
        messageType: message_type,
        replyToId: reply_to_id,
      });

      // Emit socket event for real-time delivery
      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room_id}`).emit('message:new', {
          room_id,
          message,
        });
      }

      res.status(201).json({
        success: true,
        message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/chat/messages/:message_id
   * Edit a message
   */
  async editMessage(req, res, next) {
    try {
      const { message_id } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      const message = await chatService.editMessage(message_id, userId, content);

      // Emit socket event
      const io = req.app.get('io');
      if (io && message) {
        io.to(`room:${message.room_id}`).emit('message:edited', {
          room_id: message.room_id,
          message,
        });
      }

      res.status(200).json({
        success: true,
        message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/chat/messages/:message_id
   * Delete a message
   */
  async deleteMessage(req, res, next) {
    try {
      const { message_id } = req.params;
      const { delete_for_all = false } = req.body;
      const userId = req.user.id;

      const message = await chatService.deleteMessage(message_id, userId, delete_for_all);

      // Emit socket event
      const io = req.app.get('io');
      if (io && message) {
        io.to(`room:${message.room_id}`).emit('message:deleted', {
          room_id: message.room_id,
          message_id,
          delete_for_all,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/rooms/:room_id/read
   * Mark messages as read
   */
  async markAsRead(req, res, next) {
    try {
      const { room_id } = req.params;
      const { up_to_message_id } = req.body;
      const userId = req.user.id;

      const result = await chatService.markAsRead(room_id, userId, up_to_message_id);

      // Emit socket event for read receipts
      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room_id}`).emit('messages:read', {
          room_id,
          user_id: userId,
          up_to_message_id,
          messages_read: result.messagesRead,
        });
      }

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/rooms/:room_id/typing
   * Update typing indicator
   */
  async updateTyping(req, res, next) {
    try {
      const { room_id } = req.params;
      const { is_typing } = req.body;
      const userId = req.user.id;

      await chatService.updateTypingStatus(room_id, userId, is_typing);

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room_id}`).emit('user:typing', {
          room_id,
          user_id: userId,
          is_typing,
        });
      }

      res.status(200).json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chat/unread
   * Get total unread message count
   */
  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.id;

      const { data, error } = await chatService.getUnreadCount(userId);

      if (error) {
        throw new Error('Failed to get unread count');
      }

      res.status(200).json({
        success: true,
        unread_count: data.total,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chat/rooms/:room_id/search
   * Search messages in a room
   */
  async searchMessages(req, res, next) {
    try {
      const { room_id } = req.params;
      const { q, limit = 20 } = req.query;
      const userId = req.user.id;

      const { data, error } = await chatService.searchMessages(room_id, userId, q, {
        limit: parseInt(limit),
      });

      if (error) {
        throw new Error('Search failed');
      }

      res.status(200).json({
        success: true,
        messages: data,
        count: data.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chat/rooms/:room_id/media
   * Get media/attachments from a room
   */
  async getRoomMedia(req, res, next) {
    try {
      const { room_id } = req.params;
      const { page = 1, limit = 20, type } = req.query;
      const userId = req.user.id;

      const { data, error, count } = await chatService.getRoomMedia(room_id, userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
      });

      if (error) {
        throw new Error('Failed to fetch media');
      }

      res.status(200).json({
        success: true,
        media: data,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/rooms/:room_id/upload
   * Upload a file attachment
   */
  async uploadFile(req, res, next) {
    try {
      const { room_id } = req.params;
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided',
        });
      }

      const fileData = await chatService.uploadFile(room_id, userId, req.file);

      res.status(200).json({
        success: true,
        file: fileData,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/chat/rooms/:room_id/file-message
   * Send a file message (upload + send in one request)
   */
  async sendFileMessage(req, res, next) {
    try {
      const { room_id } = req.params;
      const { reply_to_id } = req.body;
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided',
        });
      }

      // Upload file
      const fileData = await chatService.uploadFile(room_id, userId, req.file);

      // Determine message type from file type
      let messageType = 'file';
      if (fileData.type === 'image') messageType = 'image';
      else if (fileData.type === 'document') messageType = 'document';

      // Send message with file
      const message = await chatService.sendMessage(room_id, userId, {
        content: fileData.name,
        messageType,
        replyToId: reply_to_id,
        fileData,
      });

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        io.to(`room:${room_id}`).emit('message:new', {
          room_id,
          message,
        });
      }

      res.status(201).json({
        success: true,
        message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/chat/rooms/:room_id/archive
   * Archive a chat room
   */
  async archiveRoom(req, res, next) {
    try {
      const { room_id } = req.params;
      const userId = req.user.id;

      await chatService.archiveRoom(room_id, userId);

      res.status(200).json({
        success: true,
        message: 'Chat room archived successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/chat/consultation/:consultation_id
   * Get chat room by consultation ID
   */
  async getRoomByConsultation(req, res, next) {
    try {
      const { consultation_id } = req.params;
      const userId = req.user.id;

      const room = await chatService.getOrCreateRoom(consultation_id, userId);

      res.status(200).json({
        success: true,
        room,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChatController();
