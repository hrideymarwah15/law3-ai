/**
 * Chat Service
 * Business logic for the chat system
 */

const chatRepository = require('../repositories/chat.repository');
const { supabaseAdmin } = require('../config/supabase');
const { cache } = require('../config/redis');
const logger = require('../config/logger');
const { NotFoundError, ForbiddenError, ValidationError } = require('../middleware/errorHandler');

// File upload constraints
const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
  file: ['application/zip', 'application/x-rar-compressed'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

class ChatService {
  /**
   * Get or create a chat room for a consultation
   */
  async getOrCreateRoom(consultationId, userId) {
    // Verify consultation exists and user has access
    const { data: consultation, error: consultError } = await supabaseAdmin
      .from('consultations')
      .select(`
        id, 
        user_id, 
        lawyer_id,
        status,
        lawyer:lawyers!consultations_lawyer_id_fkey(id, user_id, verification_status)
      `)
      .eq('id', consultationId)
      .single();

    if (consultError || !consultation) {
      throw new NotFoundError('Consultation not found');
    }

    // Check if user is participant
    const isUser = consultation.user_id === userId;
    const isLawyer = consultation.lawyer?.user_id === userId;

    if (!isUser && !isLawyer) {
      throw new ForbiddenError('You are not a participant of this consultation');
    }

    // Check consultation status - only allow chat for confirmed/ongoing consultations
    const allowedStatuses = ['confirmed', 'in_progress', 'completed'];
    if (!allowedStatuses.includes(consultation.status)) {
      throw new ValidationError('Chat is not available for this consultation status');
    }

    // If lawyer, check verification
    if (isLawyer && consultation.lawyer?.verification_status !== 'verified') {
      throw new ForbiddenError('Your lawyer profile must be verified to use chat');
    }

    // Get or create room
    const { data: room, error } = await chatRepository.getOrCreateRoom(
      consultationId,
      consultation.user_id,
      consultation.lawyer_id
    );

    if (error) {
      logger.error({ message: 'Failed to get/create chat room', error: error.message });
      throw new Error('Failed to initialize chat room');
    }

    // Fetch full room details
    const { data: fullRoom } = await chatRepository.getRoomById(room.id);

    return fullRoom || room;
  }

  /**
   * Get room by ID with access check
   */
  async getRoom(roomId, userId) {
    const { data: room, error } = await chatRepository.getRoomById(roomId);

    if (error || !room) {
      throw new NotFoundError('Chat room not found');
    }

    // Verify access
    const hasAccess = this._checkRoomAccess(room, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this chat room');
    }

    return room;
  }

  /**
   * Get user's chat rooms
   */
  async getUserRooms(userId, options = {}) {
    // Check if user is a lawyer
    const { data: lawyer } = await supabaseAdmin
      .from('lawyers')
      .select('id, verification_status')
      .eq('user_id', userId)
      .single();

    if (lawyer && lawyer.verification_status === 'verified') {
      // Get rooms as lawyer
      const { data, error, count } = await chatRepository.getLawyerRooms(lawyer.id, options);
      
      if (error) {
        throw new Error('Failed to fetch chat rooms');
      }

      return {
        rooms: data || [],
        total: count || 0,
        page: options.page || 1,
        limit: options.limit || 20,
        role: 'lawyer',
      };
    } else {
      // Get rooms as user
      const { data, error, count } = await chatRepository.getUserRooms(userId, options);
      
      if (error) {
        throw new Error('Failed to fetch chat rooms');
      }

      return {
        rooms: data || [],
        total: count || 0,
        page: options.page || 1,
        limit: options.limit || 20,
        role: 'user',
      };
    }
  }

  /**
   * Send a message
   */
  async sendMessage(roomId, userId, { content, messageType = 'text', replyToId = null, fileData = null }) {
    // Get room and verify access
    const { data: room, error: roomError } = await chatRepository.getRoomById(roomId);

    if (roomError || !room) {
      throw new NotFoundError('Chat room not found');
    }

    // Check access
    const hasAccess = this._checkRoomAccess(room, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this chat room');
    }

    // Check room status
    if (room.status !== 'active') {
      throw new ValidationError('This chat room is no longer active');
    }

    // Determine sender type
    const senderType = this._getSenderType(room, userId);

    // If lawyer, verify they are verified
    if (senderType === 'lawyer') {
      const { data: lawyer } = await supabaseAdmin
        .from('lawyers')
        .select('verification_status')
        .eq('id', room.lawyer_id)
        .single();

      if (!lawyer || lawyer.verification_status !== 'verified') {
        throw new ForbiddenError('Your lawyer profile must be verified to send messages');
      }
    }

    // Validate content
    if (messageType === 'text' && (!content || content.trim().length === 0)) {
      throw new ValidationError('Message content cannot be empty');
    }

    if (content && content.length > 5000) {
      throw new ValidationError('Message content exceeds maximum length of 5000 characters');
    }

    // Validate reply
    if (replyToId) {
      const { data: replyMsg, error: replyError } = await chatRepository.getMessageById(replyToId);
      if (replyError || !replyMsg || replyMsg.room_id !== roomId) {
        throw new ValidationError('Invalid reply message');
      }
    }

    // Create message with snake_case parameters for repository
    const messageData = {
      room_id: roomId,
      sender_id: userId,
      sender_type: senderType,
      message_type: messageType,
      content: content?.trim(),
      reply_to_id: replyToId,
    };

    // Handle file attachment
    if (fileData && messageType !== 'text') {
      messageData.file_url = fileData.url;
      messageData.file_name = fileData.name;
      messageData.file_size = fileData.size;
      messageData.file_mime_type = fileData.mimeType;
      messageData.thumbnail_url = fileData.thumbnailUrl;
    }

    const { data: message, error } = await chatRepository.createMessage(messageData);

    if (error) {
      logger.error({ message: 'Failed to send message', error: error.message, roomId, userId });
      throw new Error('Failed to send message');
    }

    // Clear room cache
    await cache.del(`chat:room:${roomId}`);

    logger.info({
      message: 'Message sent',
      roomId,
      messageId: message.id,
      senderId: userId,
      senderType,
    });

    return message;
  }

  /**
   * Get messages for a room
   */
  async getMessages(roomId, userId, options = {}) {
    // Verify access
    const { data: room, error: roomError } = await chatRepository.getRoomById(roomId);

    if (roomError || !room) {
      throw new NotFoundError('Chat room not found');
    }

    const hasAccess = this._checkRoomAccess(room, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this chat room');
    }

    const { data: messages, error } = await chatRepository.getRoomMessages(roomId, options);

    if (error) {
      throw new Error('Failed to fetch messages');
    }

    return messages;
  }

  /**
   * Mark messages as read
   */
  async markAsRead(roomId, userId, upToMessageId = null) {
    // Verify access
    const { data: room, error: roomError } = await chatRepository.getRoomById(roomId);

    if (roomError || !room) {
      throw new NotFoundError('Chat room not found');
    }

    const hasAccess = this._checkRoomAccess(room, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this chat room');
    }

    const { data, error } = await chatRepository.markMessagesAsRead(roomId, userId, upToMessageId);

    if (error) {
      logger.error({ message: 'Failed to mark messages as read', error: error.message });
      throw new Error('Failed to mark messages as read');
    }

    // Clear cache
    await cache.del(`chat:room:${roomId}`);

    return data;
  }

  /**
   * Edit a message
   */
  async editMessage(messageId, userId, newContent) {
    if (!newContent || newContent.trim().length === 0) {
      throw new ValidationError('Message content cannot be empty');
    }

    if (newContent.length > 5000) {
      throw new ValidationError('Message content exceeds maximum length');
    }

    const { data: message, error: getError } = await chatRepository.getMessageById(messageId);

    if (getError || !message) {
      throw new NotFoundError('Message not found');
    }

    // Check if within edit window (15 minutes)
    const editWindow = 15 * 60 * 1000;
    const messageAge = Date.now() - new Date(message.created_at).getTime();
    
    if (messageAge > editWindow) {
      throw new ValidationError('Message can only be edited within 15 minutes of sending');
    }

    const { data, error } = await chatRepository.editMessage(messageId, userId, newContent.trim());

    if (error) {
      if (error.message === 'Not authorized to edit this message') {
        throw new ForbiddenError(error.message);
      }
      throw new Error('Failed to edit message');
    }

    return data;
  }

  /**
   * Delete a message
   */
  async deleteMessage(messageId, userId, deleteForAll = false) {
    const { data: message, error: getError } = await chatRepository.getMessageById(messageId);

    if (getError || !message) {
      throw new NotFoundError('Message not found');
    }

    if (message.sender_id !== userId) {
      throw new ForbiddenError('You can only delete your own messages');
    }

    // For "delete for all", check time window (1 hour)
    if (deleteForAll) {
      const deleteWindow = 60 * 60 * 1000;
      const messageAge = Date.now() - new Date(message.created_at).getTime();
      
      if (messageAge > deleteWindow) {
        throw new ValidationError('Messages can only be deleted for everyone within 1 hour');
      }
    }

    const { data, error } = await chatRepository.deleteMessage(messageId, userId, deleteForAll);

    if (error) {
      throw new Error('Failed to delete message');
    }

    return data;
  }

  /**
   * Update typing status
   */
  async updateTypingStatus(roomId, userId, isTyping) {
    const { data: room } = await chatRepository.getRoomById(roomId);

    if (!room || !this._checkRoomAccess(room, userId)) {
      return null;
    }

    return chatRepository.updateTypingStatus(roomId, userId, isTyping);
  }

  /**
   * Update user presence
   */
  async updatePresence(userId, presenceData) {
    return chatRepository.updatePresence(userId, presenceData);
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userId) {
    // Check if user is a lawyer
    const { data: lawyer } = await supabaseAdmin
      .from('lawyers')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (lawyer) {
      return chatRepository.getUnreadCount(userId, true, lawyer.id);
    }

    return chatRepository.getUnreadCount(userId, false);
  }

  /**
   * Search messages
   */
  async searchMessages(roomId, userId, searchTerm, options = {}) {
    const { data: room } = await chatRepository.getRoomById(roomId);

    if (!room || !this._checkRoomAccess(room, userId)) {
      throw new ForbiddenError('You do not have access to this chat room');
    }

    if (!searchTerm || searchTerm.trim().length < 2) {
      throw new ValidationError('Search term must be at least 2 characters');
    }

    return chatRepository.searchMessages(roomId, searchTerm.trim(), options);
  }

  /**
   * Get room media/attachments
   */
  async getRoomMedia(roomId, userId, options = {}) {
    const { data: room } = await chatRepository.getRoomById(roomId);

    if (!room || !this._checkRoomAccess(room, userId)) {
      throw new ForbiddenError('You do not have access to this chat room');
    }

    return chatRepository.getRoomMedia(roomId, options);
  }

  /**
   * Upload file and create attachment
   */
  async uploadFile(roomId, userId, file) {
    // Verify room access
    const { data: room } = await chatRepository.getRoomById(roomId);

    if (!room || !this._checkRoomAccess(room, userId)) {
      throw new ForbiddenError('You do not have access to this chat room');
    }

    // Validate file
    const fileType = this._getFileType(file.mimetype);
    if (!fileType) {
      throw new ValidationError('File type not allowed');
    }

    const maxSize = fileType === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    if (file.size > maxSize) {
      throw new ValidationError(`File size exceeds maximum allowed (${maxSize / 1024 / 1024}MB)`);
    }

    // Generate unique filename
    const ext = file.originalname.split('.').pop();
    const fileName = `${roomId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('chat-attachments')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
      });

    if (uploadError) {
      logger.error({ message: 'File upload failed', error: uploadError.message });
      throw new Error('Failed to upload file');
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('chat-attachments')
      .getPublicUrl(fileName);

    return {
      url: urlData.publicUrl,
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      type: fileType,
      storagePath: fileName,
    };
  }

  /**
   * Archive a chat room
   */
  async archiveRoom(roomId, userId) {
    const { data: room } = await chatRepository.getRoomById(roomId);

    if (!room) {
      throw new NotFoundError('Chat room not found');
    }

    if (!this._checkRoomAccess(room, userId)) {
      throw new ForbiddenError('You do not have access to this chat room');
    }

    return chatRepository.archiveRoom(roomId, userId);
  }

  // ============================================
  // Private helper methods
  // ============================================

  _checkRoomAccess(room, userId) {
    if (!room) return false;
    
    // User is the client
    if (room.user_id === userId) return true;
    
    // User is the lawyer
    if (room.lawyer?.user_id === userId) return true;
    
    return false;
  }

  _getSenderType(room, userId) {
    if (room.user_id === userId) return 'user';
    if (room.lawyer?.user_id === userId) return 'lawyer';
    return 'user';
  }

  _getFileType(mimeType) {
    for (const [type, mimes] of Object.entries(ALLOWED_FILE_TYPES)) {
      if (mimes.includes(mimeType)) return type;
    }
    return null;
  }
}

module.exports = new ChatService();
