/**
 * Chat Repository
 * Database operations for the chat system
 */

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');

class ChatRepository {
  /**
   * Get or create a chat room for a consultation
   */
  async getOrCreateRoom(consultationId, userId, lawyerId) {
    // First try to find existing room
    const { data: existing, error: findError } = await supabaseAdmin
      .from('chat_rooms')
      .select('*')
      .eq('consultation_id', consultationId)
      .eq('is_deleted', false)
      .single();

    if (existing) {
      return { data: existing, error: null };
    }

    // Create new room
    const { data, error } = await supabaseAdmin
      .from('chat_rooms')
      .insert({
        consultation_id: consultationId,
        user_id: userId,
        lawyer_id: lawyerId,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      logger.error({ message: 'Failed to create chat room', error: error.message, consultationId });
    }

    return { data, error };
  }

  /**
   * Get chat room by ID with participants info
   */
  async getRoomById(roomId) {
    const { data, error } = await supabaseAdmin
      .from('chat_rooms')
      .select(`
        *,
        user:users!chat_rooms_user_id_fkey(id, first_name, last_name, display_name, avatar_url, email),
        lawyer:lawyers!chat_rooms_lawyer_id_fkey(
          id, 
          user_id,
          profile_photo_url,
          specialization,
          user:users!lawyers_user_id_fkey(id, first_name, last_name, display_name, email)
        ),
        consultation:consultations!chat_rooms_consultation_id_fkey(id, status, booking_date, booking_time)
      `)
      .eq('id', roomId)
      .eq('is_deleted', false)
      .single();

    return { data, error };
  }

  /**
   * Get chat room by consultation ID
   */
  async getRoomByConsultationId(consultationId) {
    const { data, error } = await supabaseAdmin
      .from('chat_rooms')
      .select(`
        *,
        user:users!chat_rooms_user_id_fkey(id, first_name, last_name, display_name, avatar_url),
        lawyer:lawyers!chat_rooms_lawyer_id_fkey(
          id, 
          user_id,
          profile_photo_url,
          user:users!lawyers_user_id_fkey(id, first_name, last_name, display_name)
        )
      `)
      .eq('consultation_id', consultationId)
      .eq('is_deleted', false)
      .single();

    return { data, error };
  }

  /**
   * Get user's chat rooms with pagination
   */
  async getUserRooms(userId, { page = 1, limit = 20, status = null } = {}) {
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('chat_rooms')
      .select(`
        *,
        user:users!chat_rooms_user_id_fkey(id, first_name, last_name, display_name, avatar_url),
        lawyer:lawyers!chat_rooms_lawyer_id_fkey(
          id, 
          user_id,
          profile_photo_url,
          specialization,
          user:users!lawyers_user_id_fkey(id, first_name, last_name, display_name)
        ),
        consultation:consultations!chat_rooms_consultation_id_fkey(id, status, booking_date)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    return { data, error, count };
  }

  /**
   * Get lawyer's chat rooms with pagination
   */
  async getLawyerRooms(lawyerId, { page = 1, limit = 20, status = null } = {}) {
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('chat_rooms')
      .select(`
        *,
        user:users!chat_rooms_user_id_fkey(id, first_name, last_name, display_name, avatar_url, phone),
        lawyer:lawyers!chat_rooms_lawyer_id_fkey(
          id, 
          user_id,
          profile_photo_url
        ),
        consultation:consultations!chat_rooms_consultation_id_fkey(id, status, booking_date, booking_time, user_notes)
      `, { count: 'exact' })
      .eq('lawyer_id', lawyerId)
      .eq('is_deleted', false)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    return { data, error, count };
  }

  /**
   * Create a new message
   */
  async createMessage({
    room_id,
    sender_id,
    sender_type,
    message_type = 'text',
    content,
    file_url = null,
    file_name = null,
    file_size = null,
    file_mime_type = null,
    thumbnail_url = null,
    reply_to_id = null,
    metadata = {},
  }) {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        room_id,
        sender_id,
        sender_type,
        message_type,
        content,
        file_url,
        file_name,
        file_size,
        file_mime_type,
        thumbnail_url,
        reply_to_id,
        metadata,
        status: 'sent',
      })
      .select(`
        *,
        sender:users!chat_messages_sender_id_fkey(id, first_name, last_name, display_name, avatar_url)
      `)
      .single();

    if (error) {
      logger.error({ message: 'Failed to create message', error: error.message, roomId });
    }

    return { data, error };
  }

  /**
   * Get messages for a room with pagination (cursor-based)
   */
  async getRoomMessages(roomId, { limit = 50, before = null, after = null } = {}) {
    let query = supabaseAdmin
      .from('chat_messages')
      .select(`
        *,
        sender:users!chat_messages_sender_id_fkey(id, first_name, last_name, display_name, avatar_url)
      `)
      .eq('room_id', roomId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      const { data: beforeMsg } = await supabaseAdmin
        .from('chat_messages')
        .select('created_at')
        .eq('id', before)
        .single();
      
      if (beforeMsg) {
        query = query.lt('created_at', beforeMsg.created_at);
      }
    }

    if (after) {
      const { data: afterMsg } = await supabaseAdmin
        .from('chat_messages')
        .select('created_at')
        .eq('id', after)
        .single();
      
      if (afterMsg) {
        query = query.gt('created_at', afterMsg.created_at);
      }
    }

    const { data, error } = await query;

    // Return in chronological order
    return { data: data?.reverse() || [], error };
  }

  /**
   * Get single message by ID
   */
  async getMessageById(messageId) {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select(`
        *,
        sender:users!chat_messages_sender_id_fkey(id, first_name, last_name, display_name, avatar_url)
      `)
      .eq('id', messageId)
      .single();

    return { data, error };
  }

  /**
   * Update message status (delivered, read)
   */
  async updateMessageStatus(messageId, status) {
    const updateData = { status };
    
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    } else if (status === 'read') {
      updateData.read_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .update(updateData)
      .eq('id', messageId)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Mark messages as read up to a certain message
   */
  async markMessagesAsRead(roomId, userId, upToMessageId = null) {
    // Get room to determine if user or lawyer
    const { data: room } = await supabaseAdmin
      .from('chat_rooms')
      .select('user_id, lawyer_id')
      .eq('id', roomId)
      .single();

    if (!room) {
      return { data: null, error: { message: 'Room not found' } };
    }

    // Update unread messages
    let query = supabaseAdmin
      .from('chat_messages')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .neq('sender_id', userId)
      .neq('status', 'read');

    if (upToMessageId) {
      const { data: upToMsg } = await supabaseAdmin
        .from('chat_messages')
        .select('created_at')
        .eq('id', upToMessageId)
        .single();

      if (upToMsg) {
        query = query.lte('created_at', upToMsg.created_at);
      }
    }

    const { data: updatedMessages, error: updateError } = await query.select();

    // Determine if caller is user or lawyer and reset their unread count
    const isUser = userId === room.user_id;
    
    const { error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .update({
        [isUser ? 'user_unread_count' : 'lawyer_unread_count']: 0,
        [isUser ? 'user_last_seen_at' : 'lawyer_last_seen_at']: new Date().toISOString(),
      })
      .eq('id', roomId);

    // Update or create read receipt
    await supabaseAdmin
      .from('chat_read_receipts')
      .upsert({
        room_id: roomId,
        user_id: userId,
        last_read_message_id: upToMessageId,
        last_read_at: new Date().toISOString(),
      }, { onConflict: 'room_id,user_id' });

    return { 
      data: { messagesRead: updatedMessages?.length || 0 }, 
      error: updateError || roomError 
    };
  }

  /**
   * Edit a message
   */
  async editMessage(messageId, senderId, newContent) {
    // First get original message
    const { data: original, error: getError } = await supabaseAdmin
      .from('chat_messages')
      .select('content, sender_id')
      .eq('id', messageId)
      .single();

    if (getError || !original) {
      return { data: null, error: getError || { message: 'Message not found' } };
    }

    if (original.sender_id !== senderId) {
      return { data: null, error: { message: 'Not authorized to edit this message' } };
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .update({
        content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString(),
        original_content: original.content,
      })
      .eq('id', messageId)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId, userId, deleteForAll = false) {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_for_all: deleteForAll,
        content: deleteForAll ? '[Message deleted]' : undefined,
      })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Update room status
   */
  async updateRoomStatus(roomId, status) {
    const { data, error } = await supabaseAdmin
      .from('chat_rooms')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', roomId)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Archive a room
   */
  async archiveRoom(roomId, userId) {
    const { data, error } = await supabaseAdmin
      .from('chat_rooms')
      .update({
        status: 'archived',
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', roomId)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Update typing status
   */
  async updateTypingStatus(roomId, userId, isTyping) {
    // Determine if user or lawyer
    const { data: room } = await supabaseAdmin
      .from('chat_rooms')
      .select('user_id')
      .eq('id', roomId)
      .single();

    if (!room) return { data: null, error: { message: 'Room not found' } };

    const isUser = userId === room.user_id;
    const field = isUser ? 'user_typing_at' : 'lawyer_typing_at';

    const { data, error } = await supabaseAdmin
      .from('chat_rooms')
      .update({
        [field]: isTyping ? new Date().toISOString() : null,
      })
      .eq('id', roomId)
      .select()
      .single();

    return { data, error };
  }

  /**
   * Update presence
   */
  async updatePresence(userId, { isOnline, socketId, deviceType, currentRoomId } = {}) {
    const { data, error } = await supabaseAdmin
      .from('chat_presence')
      .upsert({
        user_id: userId,
        is_online: isOnline,
        socket_id: socketId,
        device_type: deviceType,
        current_room_id: currentRoomId,
        last_seen_at: new Date().toISOString(),
        connected_at: isOnline ? new Date().toISOString() : undefined,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    return { data, error };
  }

  /**
   * Get presence for multiple users
   */
  async getPresence(userIds) {
    const { data, error } = await supabaseAdmin
      .from('chat_presence')
      .select('*')
      .in('user_id', userIds);

    return { data, error };
  }

  /**
   * Create attachment record
   */
  async createAttachment({
    messageId,
    roomId,
    uploadedBy,
    fileName,
    fileOriginalName,
    fileSize,
    fileMimeType,
    fileExtension,
    storagePath,
    publicUrl,
    thumbnailPath = null,
    thumbnailUrl = null,
  }) {
    const { data, error } = await supabaseAdmin
      .from('chat_attachments')
      .insert({
        message_id: messageId,
        room_id: roomId,
        uploaded_by: uploadedBy,
        file_name: fileName,
        file_original_name: fileOriginalName,
        file_size: fileSize,
        file_mime_type: fileMimeType,
        file_extension: fileExtension,
        storage_path: storagePath,
        public_url: publicUrl,
        thumbnail_path: thumbnailPath,
        thumbnail_url: thumbnailUrl,
      })
      .select()
      .single();

    return { data, error };
  }

  /**
   * Get total unread count for a user
   */
  async getUnreadCount(userId, isLawyer = false, lawyerId = null) {
    let query = supabaseAdmin
      .from('chat_rooms')
      .select('user_unread_count, lawyer_unread_count')
      .eq('is_deleted', false);

    if (isLawyer && lawyerId) {
      query = query.eq('lawyer_id', lawyerId);
      const { data, error } = await query;
      const total = data?.reduce((sum, r) => sum + (r.lawyer_unread_count || 0), 0) || 0;
      return { data: { total }, error };
    } else {
      query = query.eq('user_id', userId);
      const { data, error } = await query;
      const total = data?.reduce((sum, r) => sum + (r.user_unread_count || 0), 0) || 0;
      return { data: { total }, error };
    }
  }

  /**
   * Search messages in a room
   */
  async searchMessages(roomId, searchTerm, { limit = 20 } = {}) {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select(`
        *,
        sender:users!chat_messages_sender_id_fkey(id, first_name, last_name, display_name)
      `)
      .eq('room_id', roomId)
      .eq('is_deleted', false)
      .ilike('content', `%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    return { data, error };
  }

  /**
   * Get media/files from a room
   */
  async getRoomMedia(roomId, { page = 1, limit = 20, type = null } = {}) {
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('chat_messages')
      .select('*', { count: 'exact' })
      .eq('room_id', roomId)
      .eq('is_deleted', false)
      .in('message_type', type ? [type] : ['file', 'image', 'document'])
      .order('created_at', { ascending: false });

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    return { data, error, count };
  }
}

module.exports = new ChatRepository();
