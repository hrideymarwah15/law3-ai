import { api } from "./client";
import type { ApiResponse, Notification, Pagination } from "@/types";

// ============================================
// Notification API Service
// ============================================

export interface NotificationListResponse {
  notifications: Notification[];
  pagination: Pagination;
}

export const notificationApi = {
  // Get all notifications
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get<ApiResponse<NotificationListResponse>>("/notifications", {
      params: { 
        ...params, 
        unread_only: params?.unreadOnly 
      },
    }),

  // Get notification by ID (backend uses notification_id param)
  getById: (id: string) =>
    api.get<ApiResponse<Notification>>(`/notifications/${id}`),

  // Mark notification as read (backend uses PUT not PATCH)
  markAsRead: (id: string) =>
    api.put<ApiResponse<Notification>>(`/notifications/${id}/read`),

  // Mark all as read (backend uses PUT not POST)
  markAllAsRead: () =>
    api.put<ApiResponse<{ count: number }>>("/notifications/read-all"),

  // Delete notification
  delete: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/notifications/${id}`),

  // Delete multiple notifications (backend uses different endpoint)
  deleteMultiple: (ids: string[]) =>
    api.delete<ApiResponse<{ count: number }>>("/notifications/delete-multiple", {
      data: { notification_ids: ids }
    }),

  // Get unread count
  getUnreadCount: () =>
    api.get<ApiResponse<{ count: number }>>("/notifications/unread-count"),

  // Update notification preferences (backend uses PUT not PATCH)
  updatePreferences: (data: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
    types?: Record<string, boolean>;
  }) =>
    api.put<ApiResponse<{ message: string }>>(
      "/notifications/preferences",
      data
    ),

  // Get notification preferences
  getPreferences: () =>
    api.get<
      ApiResponse<{
        email: boolean;
        push: boolean;
        sms: boolean;
        types: Record<string, boolean>;
      }>
    >("/notifications/preferences"),

  // Subscribe to push notifications
  subscribePush: (subscription: PushSubscription) =>
    api.post<ApiResponse<{ message: string }>>("/notifications/push/subscribe", {
      subscription,
    }),

  // Unsubscribe from push notifications
  unsubscribePush: () =>
    api.post<ApiResponse<{ message: string }>>("/notifications/push/unsubscribe"),
};
