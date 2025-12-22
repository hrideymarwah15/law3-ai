import { api } from "./client";
import type { ApiResponse, ChatRoom, ChatMessage, Pagination } from "@/types";

// ============================================
// Chat API Service
// ============================================

export interface ChatRoomListResponse {
  rooms: ChatRoom[];
  pagination: Pagination;
}

export interface ChatMessageListResponse {
  messages: ChatMessage[];
  pagination: Pagination;
}

export const chatApi = {
  // Get all chat rooms for current user
  getRooms: (params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<ChatRoomListResponse>>("/chat/rooms", { params }),

  // Get chat room by ID
  getRoomById: (id: string) =>
    api.get<ApiResponse<ChatRoom>>(`/chat/rooms/${id}`),

  // Get or create room for consultation
  getOrCreateRoom: (consultationId: string) =>
    api.post<ApiResponse<ChatRoom>>(`/chat/rooms/consultation/${consultationId}`),

  // Get messages for a room
  getMessages: (
    roomId: string,
    params?: { page?: number; limit?: number; before?: string }
  ) =>
    api.get<ApiResponse<ChatMessageListResponse>>(
      `/chat/rooms/${roomId}/messages`,
      { params }
    ),

  // Send message
  sendMessage: (
    roomId: string,
    data: { content: string; type?: "text" | "image" | "document" }
  ) =>
    api.post<ApiResponse<ChatMessage>>(`/chat/rooms/${roomId}/messages`, data),

  // Upload attachment
  uploadAttachment: (roomId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<ApiResponse<{ url: string; type: string }>>(
      `/chat/rooms/${roomId}/upload`,
      formData
    );
  },

  // Mark messages as read
  markAsRead: (roomId: string, messageIds?: string[]) =>
    api.post<ApiResponse<{ count: number }>>(`/chat/rooms/${roomId}/read`, {
      messageIds,
    }),

  // Delete message
  deleteMessage: (roomId: string, messageId: string) =>
    api.delete<ApiResponse<{ message: string }>>(
      `/chat/rooms/${roomId}/messages/${messageId}`
    ),

  // Get unread count
  getUnreadCount: () =>
    api.get<ApiResponse<{ count: number }>>("/chat/unread"),
};
