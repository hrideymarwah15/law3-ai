import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ChatRoom, ChatMessage, User } from "@/types";

// ============================================
// Chat Store Types
// ============================================

interface TypingUser {
  id: string;
  name: string;
  roomId: string;
}

interface ChatState {
  // Active room
  activeRoomId: string | null;
  activeRoom: ChatRoom | null;
  
  // Rooms list
  rooms: ChatRoom[];
  roomsLoading: boolean;
  
  // Messages by room ID
  messagesByRoom: Record<string, ChatMessage[]>;
  messagesLoading: boolean;
  
  // Typing indicators
  typingUsers: TypingUser[];
  
  // Unread counts by room ID
  unreadCounts: Record<string, number>;
  totalUnread: number;
  
  // Connection status
  isConnected: boolean;
  isReconnecting: boolean;
  
  // Online users (by user ID)
  onlineUsers: Set<string>;
  
  // Actions
  setActiveRoom: (roomId: string | null, room?: ChatRoom) => void;
  
  // Room actions
  setRooms: (rooms: ChatRoom[]) => void;
  addRoom: (room: ChatRoom) => void;
  updateRoom: (roomId: string, updates: Partial<ChatRoom>) => void;
  removeRoom: (roomId: string) => void;
  setRoomsLoading: (loading: boolean) => void;
  
  // Message actions
  setMessages: (roomId: string, messages: ChatMessage[]) => void;
  addMessage: (roomId: string, message: ChatMessage) => void;
  updateMessage: (roomId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (roomId: string, messageId: string) => void;
  prependMessages: (roomId: string, messages: ChatMessage[]) => void;
  setMessagesLoading: (loading: boolean) => void;
  
  // Typing actions
  addTypingUser: (user: TypingUser) => void;
  removeTypingUser: (userId: string, roomId: string) => void;
  clearTypingUsers: (roomId: string) => void;
  
  // Unread actions
  setUnreadCount: (roomId: string, count: number) => void;
  incrementUnread: (roomId: string) => void;
  markAsRead: (roomId: string) => void;
  markAllAsRead: () => void;
  
  // Connection actions
  setConnected: (connected: boolean) => void;
  setReconnecting: (reconnecting: boolean) => void;
  
  // Online users actions
  setOnlineUsers: (userIds: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  isUserOnline: (userId: string) => boolean;
  
  // Reset
  reset: () => void;
}

// Initial state factory
const getInitialState = () => ({
  activeRoomId: null,
  activeRoom: null,
  rooms: [],
  roomsLoading: false,
  messagesByRoom: {},
  messagesLoading: false,
  typingUsers: [],
  unreadCounts: {},
  totalUnread: 0,
  isConnected: false,
  isReconnecting: false,
  onlineUsers: new Set<string>(),
});

// ============================================
// Chat Store Implementation
// ============================================

export const useChatStore = create<ChatState>()(
  immer((set, get) => ({
    ...getInitialState(),

    // Active Room
    setActiveRoom: (roomId, room) =>
      set((state) => {
        state.activeRoomId = roomId;
        state.activeRoom = room || null;
        // Mark as read when opening a room
        if (roomId && state.unreadCounts[roomId]) {
          state.totalUnread -= state.unreadCounts[roomId];
          state.unreadCounts[roomId] = 0;
        }
      }),

    // Room Actions
    setRooms: (rooms) =>
      set((state) => {
        state.rooms = rooms;
      }),

    addRoom: (room) =>
      set((state) => {
        const exists = state.rooms.some((r) => r.id === room.id);
        if (!exists) {
          state.rooms.unshift(room);
        }
      }),

    updateRoom: (roomId, updates) =>
      set((state) => {
        const index = state.rooms.findIndex((r) => r.id === roomId);
        if (index !== -1) {
          state.rooms[index] = { ...state.rooms[index], ...updates };
        }
        if (state.activeRoom?.id === roomId) {
          state.activeRoom = { ...state.activeRoom, ...updates };
        }
      }),

    removeRoom: (roomId) =>
      set((state) => {
        state.rooms = state.rooms.filter((r) => r.id !== roomId);
        if (state.activeRoomId === roomId) {
          state.activeRoomId = null;
          state.activeRoom = null;
        }
        delete state.messagesByRoom[roomId];
        delete state.unreadCounts[roomId];
      }),

    setRoomsLoading: (loading) =>
      set((state) => {
        state.roomsLoading = loading;
      }),

    // Message Actions
    setMessages: (roomId, messages) =>
      set((state) => {
        state.messagesByRoom[roomId] = messages;
      }),

    addMessage: (roomId, message) =>
      set((state) => {
        if (!state.messagesByRoom[roomId]) {
          state.messagesByRoom[roomId] = [];
        }
        state.messagesByRoom[roomId].push(message);

        // Update room's last message time
        const roomIndex = state.rooms.findIndex((r) => r.id === roomId);
        if (roomIndex !== -1) {
          state.rooms[roomIndex].lastMessageAt = message.createdAt;
          // Move room to top
          const [room] = state.rooms.splice(roomIndex, 1);
          state.rooms.unshift(room);
        }
      }),

    updateMessage: (roomId, messageId, updates) =>
      set((state) => {
        const messages = state.messagesByRoom[roomId];
        if (messages) {
          const index = messages.findIndex((m) => m.id === messageId);
          if (index !== -1) {
            messages[index] = { ...messages[index], ...updates };
          }
        }
      }),

    deleteMessage: (roomId, messageId) =>
      set((state) => {
        const messages = state.messagesByRoom[roomId];
        if (messages) {
          state.messagesByRoom[roomId] = messages.filter(
            (m) => m.id !== messageId
          );
        }
      }),

    prependMessages: (roomId, messages) =>
      set((state) => {
        if (!state.messagesByRoom[roomId]) {
          state.messagesByRoom[roomId] = [];
        }
        state.messagesByRoom[roomId].unshift(...messages);
      }),

    setMessagesLoading: (loading) =>
      set((state) => {
        state.messagesLoading = loading;
      }),

    // Typing Actions
    addTypingUser: (user) =>
      set((state) => {
        const exists = state.typingUsers.some(
          (u) => u.id === user.id && u.roomId === user.roomId
        );
        if (!exists) {
          state.typingUsers.push(user);
        }
      }),

    removeTypingUser: (userId, roomId) =>
      set((state) => {
        state.typingUsers = state.typingUsers.filter(
          (u) => !(u.id === userId && u.roomId === roomId)
        );
      }),

    clearTypingUsers: (roomId) =>
      set((state) => {
        state.typingUsers = state.typingUsers.filter(
          (u) => u.roomId !== roomId
        );
      }),

    // Unread Actions
    setUnreadCount: (roomId, count) =>
      set((state) => {
        const oldCount = state.unreadCounts[roomId] || 0;
        state.unreadCounts[roomId] = count;
        state.totalUnread = state.totalUnread - oldCount + count;
      }),

    incrementUnread: (roomId) =>
      set((state) => {
        // Don't increment if this is the active room
        if (state.activeRoomId !== roomId) {
          state.unreadCounts[roomId] = (state.unreadCounts[roomId] || 0) + 1;
          state.totalUnread += 1;
        }
      }),

    markAsRead: (roomId) =>
      set((state) => {
        const count = state.unreadCounts[roomId] || 0;
        state.unreadCounts[roomId] = 0;
        state.totalUnread = Math.max(0, state.totalUnread - count);
      }),

    markAllAsRead: () =>
      set((state) => {
        state.unreadCounts = {};
        state.totalUnread = 0;
      }),

    // Connection Actions
    setConnected: (connected) =>
      set((state) => {
        state.isConnected = connected;
        if (connected) state.isReconnecting = false;
      }),

    setReconnecting: (reconnecting) =>
      set((state) => {
        state.isReconnecting = reconnecting;
      }),

    // Online Users Actions
    setOnlineUsers: (userIds) =>
      set((state) => {
        state.onlineUsers = new Set(userIds);
      }),

    addOnlineUser: (userId) =>
      set((state) => {
        state.onlineUsers.add(userId);
      }),

    removeOnlineUser: (userId) =>
      set((state) => {
        state.onlineUsers.delete(userId);
      }),

    isUserOnline: (userId) => get().onlineUsers.has(userId),

    // Reset
    reset: () => set(getInitialState()),
  }))
);

// ============================================
// Chat Selectors
// ============================================

export const selectActiveRoom = (state: ChatState) => state.activeRoom;
export const selectRooms = (state: ChatState) => state.rooms;
export const selectIsConnected = (state: ChatState) => state.isConnected;
export const selectTotalUnread = (state: ChatState) => state.totalUnread;
export const selectMessagesForRoom = (roomId: string) => (state: ChatState) =>
  state.messagesByRoom[roomId] || [];
export const selectTypingUsersForRoom = (roomId: string) => (state: ChatState) =>
  state.typingUsers.filter((u) => u.roomId === roomId);
