/**
 * Socket.io Server Configuration
 * Real-time communication for chat system
 */

const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');
const chatService = require('../services/chat.service');
const chatRepository = require('../repositories/chat.repository');
const logger = require('../config/logger');
const config = require('../config');

let io = null;

/**
 * Initialize Socket.io server
 */
async function initializeSocketServer(httpServer) {
  // Create Socket.io server
  io = new Server(httpServer, {
    cors: {
      origin: config.security.corsOrigins || ['http://localhost:3000', 'http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    perMessageDeflate: {
      threshold: 1024,
    },
  });

  // Setup Redis adapter for horizontal scaling
  if (config.redis.url) {
    try {
      const pubClient = createClient({ url: config.redis.url });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      io.adapter(createAdapter(pubClient, subClient));
      logger.info({ message: 'Socket.io Redis adapter connected' });
    } catch (error) {
      logger.warn({ message: 'Redis adapter failed, using in-memory adapter', error: error.message });
    }
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return next(new Error('Invalid or expired token'));
      }

      // Fetch user profile
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return next(new Error('User profile not found'));
      }

      if (!profile.is_active) {
        return next(new Error('Account is deactivated'));
      }

      // Fetch lawyer profile if applicable
      let lawyerProfile = null;
      if (profile.role === 'lawyer') {
        const { data: lawyer } = await supabaseAdmin
          .from('lawyers')
          .select('*')
          .eq('user_id', user.id)
          .single();
        lawyerProfile = lawyer;
      }

      // Attach user to socket
      socket.user = {
        id: user.id,
        email: user.email,
        ...profile,
        lawyerProfile,
      };

      next();
    } catch (error) {
      logger.error({ message: 'Socket authentication error', error: error.message });
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    
    logger.info({
      message: 'User connected to socket',
      userId,
      socketId: socket.id,
    });

    // Update user presence
    await chatService.updatePresence(userId, {
      isOnline: true,
      socketId: socket.id,
      deviceType: socket.handshake.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
    });

    // Join user's personal room for direct notifications
    socket.join(`user:${userId}`);

    // Auto-join user's active chat rooms
    const { rooms } = await chatService.getUserRooms(userId, { limit: 100 });
    for (const room of rooms || []) {
      socket.join(`room:${room.id}`);
    }

    // Broadcast online status to relevant rooms
    socket.broadcast.emit('user:online', {
      user_id: userId,
      is_online: true,
    });

    // ============================================
    // Chat Event Handlers
    // ============================================

    /**
     * Join a specific chat room
     */
    socket.on('room:join', async (data, callback) => {
      try {
        const { room_id } = data;

        // Verify access
        const room = await chatService.getRoom(room_id, userId);

        if (room) {
          socket.join(`room:${room_id}`);
          
          // Update presence
          await chatService.updatePresence(userId, {
            currentRoomId: room_id,
          });

          // Notify room members
          socket.to(`room:${room_id}`).emit('user:joined', {
            room_id,
            user_id: userId,
          });

          callback?.({ success: true, room });
        }
      } catch (error) {
        logger.error({ message: 'Failed to join room', error: error.message, userId });
        callback?.({ success: false, error: error.message });
      }
    });

    /**
     * Leave a chat room
     */
    socket.on('room:leave', async (data, callback) => {
      try {
        const { room_id } = data;

        socket.leave(`room:${room_id}`);

        // Update presence
        await chatService.updatePresence(userId, {
          currentRoomId: null,
        });

        // Notify room members
        socket.to(`room:${room_id}`).emit('user:left', {
          room_id,
          user_id: userId,
        });

        callback?.({ success: true });
      } catch (error) {
        callback?.({ success: false, error: error.message });
      }
    });

    /**
     * Send a message via socket
     */
    socket.on('message:send', async (data, callback) => {
      try {
        const { room_id, content, message_type = 'text', reply_to_id } = data;

        const message = await chatService.sendMessage(room_id, userId, {
          content,
          messageType: message_type,
          replyToId: reply_to_id,
        });

        // Broadcast to room
        io.to(`room:${room_id}`).emit('message:new', {
          room_id,
          message,
        });

        callback?.({ success: true, message });
      } catch (error) {
        logger.error({ message: 'Failed to send message via socket', error: error.message });
        callback?.({ success: false, error: error.message });
      }
    });

    /**
     * Typing indicator
     */
    socket.on('typing:start', async (data) => {
      const { room_id } = data;

      await chatService.updateTypingStatus(room_id, userId, true);

      socket.to(`room:${room_id}`).emit('user:typing', {
        room_id,
        user_id: userId,
        user_name: socket.user.display_name || socket.user.first_name,
        is_typing: true,
      });
    });

    socket.on('typing:stop', async (data) => {
      const { room_id } = data;

      await chatService.updateTypingStatus(room_id, userId, false);

      socket.to(`room:${room_id}`).emit('user:typing', {
        room_id,
        user_id: userId,
        is_typing: false,
      });
    });

    /**
     * Mark messages as read
     */
    socket.on('messages:read', async (data, callback) => {
      try {
        const { room_id, up_to_message_id } = data;

        const result = await chatService.markAsRead(room_id, userId, up_to_message_id);

        // Notify sender that messages were read
        socket.to(`room:${room_id}`).emit('messages:read', {
          room_id,
          reader_id: userId,
          up_to_message_id,
          messages_read: result.messagesRead,
        });

        callback?.({ success: true, ...result });
      } catch (error) {
        callback?.({ success: false, error: error.message });
      }
    });

    /**
     * Message delivered acknowledgment
     */
    socket.on('message:delivered', async (data) => {
      const { room_id, message_id } = data;

      await chatRepository.updateMessageStatus(message_id, 'delivered');

      socket.to(`room:${room_id}`).emit('message:status', {
        room_id,
        message_id,
        status: 'delivered',
      });
    });

    /**
     * Get online status of users
     */
    socket.on('presence:get', async (data, callback) => {
      try {
        const { user_ids } = data;
        const { data: presenceData } = await chatRepository.getPresence(user_ids);
        callback?.({ success: true, presence: presenceData });
      } catch (error) {
        callback?.({ success: false, error: error.message });
      }
    });

    // ============================================
    // Disconnect Handler
    // ============================================

    socket.on('disconnect', async (reason) => {
      logger.info({
        message: 'User disconnected from socket',
        userId,
        socketId: socket.id,
        reason,
      });

      // Update presence
      await chatService.updatePresence(userId, {
        isOnline: false,
        socketId: null,
        currentRoomId: null,
      });

      // Broadcast offline status
      socket.broadcast.emit('user:online', {
        user_id: userId,
        is_online: false,
        last_seen: new Date().toISOString(),
      });
    });

    // ============================================
    // Error Handler
    // ============================================

    socket.on('error', (error) => {
      logger.error({
        message: 'Socket error',
        userId,
        socketId: socket.id,
        error: error.message,
      });
    });
  });

  return io;
}

/**
 * Get the Socket.io instance
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

/**
 * Emit event to a specific room
 */
function emitToRoom(roomId, event, data) {
  if (io) {
    io.to(`room:${roomId}`).emit(event, data);
  }
}

/**
 * Emit event to a specific user
 */
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Emit event to multiple users
 */
function emitToUsers(userIds, event, data) {
  if (io) {
    for (const userId of userIds) {
      io.to(`user:${userId}`).emit(event, data);
    }
  }
}

/**
 * Get connected sockets count
 */
async function getConnectedCount() {
  if (io) {
    const sockets = await io.fetchSockets();
    return sockets.length;
  }
  return 0;
}

module.exports = {
  initializeSocketServer,
  getIO,
  emitToRoom,
  emitToUser,
  emitToUsers,
  getConnectedCount,
};
