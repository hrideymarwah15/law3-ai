'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useChatStore, useNotificationStore } from '@/stores';
import { config } from '@/config';
import type { ChatMessage, Notification } from '@/types';

// ============================================
// Types
// ============================================

interface TypingEventPayload {
  roomId: string;
  userId: string;
  userName: string;
}

interface OnlineUserPayload {
  id: string;
  name: string;
}

interface CallEventPayload {
  callId: string;
  from?: { id: string; name: string };
  roomId?: string;
}

// ============================================
// Socket Connection Hook
// ============================================

interface UseSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export function useSocket(options: UseSocketOptions = {}) {
  const {
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = config.socket.reconnectionAttempts,
    reconnectionDelay = config.socket.reconnectionDelay,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const tokens = useAuthStore((state) => state.tokens);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  const setConnected = useChatStore((state) => state.setConnected);
  const setReconnecting = useChatStore((state) => state.setReconnecting);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const addTypingUser = useChatStore((state) => state.addTypingUser);
  const removeTypingUser = useChatStore((state) => state.removeTypingUser);
  const setOnlineUsers = useChatStore((state) => state.setOnlineUsers);
  const addOnlineUser = useChatStore((state) => state.addOnlineUser);
  const removeOnlineUser = useChatStore((state) => state.removeOnlineUser);
  
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [isConnected, setIsConnectedLocal] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // ============================================
  // Initialize Socket Connection
  // ============================================

  const connect = useCallback(() => {
    if (!tokens?.accessToken || !isAuthenticated) {
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    const socket = io(config.socket.url, {
      auth: {
        token: tokens.accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      timeout: 10000,
    });

    // Connection events
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnectedLocal(true);
      setConnected(true);
      setLastError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnectedLocal(false);
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnectedLocal(false);
      setConnected(false);
      setLastError(error.message);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsConnectedLocal(true);
      setConnected(true);
      setReconnecting(false);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber);
      setReconnecting(true);
    });

    socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed');
      setReconnecting(false);
      setLastError('Failed to reconnect after maximum attempts');
    });

    // Chat events
    socket.on('message', (message: ChatMessage & { roomId: string }) => {
      addMessage(message.roomId, message);
    });

    socket.on('message_updated', (data: { roomId: string; messageId: string; updates: Partial<ChatMessage> }) => {
      updateMessage(data.roomId, data.messageId, data.updates);
    });

    socket.on('typing_start', ({ roomId, userId, userName }: TypingEventPayload) => {
      addTypingUser({ id: userId, name: userName, roomId });
    });

    socket.on('typing_stop', ({ roomId, userId }: { roomId: string; userId: string }) => {
      removeTypingUser(userId, roomId);
    });

    socket.on('online_users', (users: OnlineUserPayload[]) => {
      setOnlineUsers(users.map((u) => u.id));
    });

    socket.on('user_online', ({ userId }: { userId: string }) => {
      addOnlineUser(userId);
    });

    socket.on('user_offline', ({ userId }: { userId: string }) => {
      removeOnlineUser(userId);
    });

    // Notification events
    socket.on('notification', (notification: Notification) => {
      addNotification(notification);
    });

    // Video call events
    socket.on('call_incoming', ({ callId, from, roomId }: CallEventPayload) => {
      // Dispatch to UI for incoming call modal
      window.dispatchEvent(
        new CustomEvent('incoming_call', {
          detail: { callId, from, roomId },
        })
      );
    });

    socket.on('call_ended', ({ callId }: CallEventPayload) => {
      window.dispatchEvent(
        new CustomEvent('call_ended', {
          detail: { callId },
        })
      );
    });

    socketRef.current = socket;
  }, [
    tokens?.accessToken,
    isAuthenticated,
    reconnection,
    reconnectionAttempts,
    reconnectionDelay,
    setConnected,
    setReconnecting,
    addMessage,
    updateMessage,
    addTypingUser,
    removeTypingUser,
    setOnlineUsers,
    addOnlineUser,
    removeOnlineUser,
    addNotification,
  ]);

  // ============================================
  // Disconnect Socket
  // ============================================

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnectedLocal(false);
      setConnected(false);
    }
  }, [setConnected]);

  // ============================================
  // Socket Emitters
  // ============================================

  const joinRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('join_room', { roomId });
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('leave_room', { roomId });
  }, []);

  const sendMessage = useCallback((roomId: string, content: string, type: 'text' | 'file' | 'image' = 'text', metadata?: Record<string, unknown>) => {
    socketRef.current?.emit('send_message', { roomId, content, type, metadata });
  }, []);

  const startTyping = useCallback((roomId: string) => {
    socketRef.current?.emit('typing_start', { roomId });
  }, []);

  const stopTyping = useCallback((roomId: string) => {
    socketRef.current?.emit('typing_stop', { roomId });
  }, []);

  const markAsRead = useCallback((roomId: string, messageIds: string[]) => {
    socketRef.current?.emit('mark_read', { roomId, messageIds });
  }, []);

  const initiateCall = useCallback((roomId: string, type: 'video' | 'audio') => {
    socketRef.current?.emit('call_initiate', { roomId, type });
  }, []);

  const answerCall = useCallback((callId: string, accept: boolean) => {
    socketRef.current?.emit('call_answer', { callId, accept });
  }, []);

  const endCall = useCallback((callId: string) => {
    socketRef.current?.emit('call_end', { callId });
  }, []);

  // ============================================
  // Auto-connect/disconnect
  // ============================================

  useEffect(() => {
    if (autoConnect && isAuthenticated && tokens?.accessToken) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, isAuthenticated, tokens?.accessToken, connect, disconnect]);

  // Getter for socket - to avoid accessing ref during render
  const getSocket = useCallback(() => socketRef.current, []);

  return {
    getSocket,
    isConnected,
    lastError,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    initiateCall,
    answerCall,
    endCall,
  };
}

// ============================================
// Chat Room Hook
// ============================================

export function useChatRoom(roomId: string | null) {
  const socket = useSocket();
  const setActiveRoom = useChatStore((state) => state.setActiveRoom);
  const messagesByRoom = useChatStore((state) => state.messagesByRoom);
  const typingUsers = useChatStore((state) => state.typingUsers);

  // Join room on mount
  useEffect(() => {
    if (roomId && socket.isConnected) {
      socket.joinRoom(roomId);
      setActiveRoom(roomId);
    }

    return () => {
      if (roomId) {
        socket.leaveRoom(roomId);
        setActiveRoom(null);
      }
    };
  }, [roomId, socket.isConnected, socket, setActiveRoom]);

  // Get room messages and typing users
  const roomMessages = roomId ? messagesByRoom[roomId] || [] : [];
  const roomTypingUsers = typingUsers.filter((u) => u.roomId === roomId);

  return {
    messages: roomMessages,
    typingUsers: roomTypingUsers,
    sendMessage: (content: string, type?: 'text' | 'file' | 'image', metadata?: Record<string, unknown>) => {
      if (roomId) {
        socket.sendMessage(roomId, content, type, metadata);
      }
    },
    startTyping: () => roomId && socket.startTyping(roomId),
    stopTyping: () => roomId && socket.stopTyping(roomId),
    markAsRead: (messageIds: string[]) => roomId && socket.markAsRead(roomId, messageIds),
    isConnected: socket.isConnected,
  };
}

// ============================================
// Online Status Hook
// ============================================

export function useOnlineStatus(userId: string) {
  const isUserOnline = useChatStore((state) => state.isUserOnline);
  return isUserOnline(userId);
}

// ============================================
// Typing Indicator Hook with Debounce
// ============================================

export function useTypingIndicator(roomId: string | null) {
  const socket = useSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTyping = useCallback(() => {
    if (!roomId || !socket.isConnected) return;

    // Start typing
    socket.startTyping(roomId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.stopTyping(roomId);
    }, 2000);
  }, [roomId, socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (roomId && socket.isConnected) {
        socket.stopTyping(roomId);
      }
    };
  }, [roomId, socket]);

  return handleTyping;
}
