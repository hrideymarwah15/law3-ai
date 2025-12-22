import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Notification } from "@/types";

// ============================================
// Notification Store Types
// ============================================

interface NotificationState {
  // Notifications list
  notifications: Notification[];
  isLoading: boolean;
  hasMore: boolean;
  page: number;
  
  // Unread count
  unreadCount: number;
  
  // Settings
  soundEnabled: boolean;
  desktopEnabled: boolean;
  
  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  addNotifications: (notifications: Notification[]) => void;
  removeNotification: (id: string) => void;
  
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
  
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setPage: (page: number) => void;
  nextPage: () => void;
  
  setSoundEnabled: (enabled: boolean) => void;
  setDesktopEnabled: (enabled: boolean) => void;
  
  reset: () => void;
}

// Initial state
const initialState = {
  notifications: [],
  isLoading: false,
  hasMore: true,
  page: 1,
  unreadCount: 0,
  soundEnabled: true,
  desktopEnabled: false,
};

// ============================================
// Notification Store Implementation
// ============================================

export const useNotificationStore = create<NotificationState>()(
  immer((set, get) => ({
    ...initialState,

    // Notifications Actions
    setNotifications: (notifications) =>
      set((state) => {
        state.notifications = notifications;
      }),

    addNotification: (notification) =>
      set((state) => {
        // Add to beginning (newest first)
        state.notifications.unshift(notification);
        if (!notification.isRead) {
          state.unreadCount += 1;
        }
      }),

    addNotifications: (notifications) =>
      set((state) => {
        state.notifications.push(...notifications);
      }),

    removeNotification: (id) =>
      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        if (notification && !notification.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter((n) => n.id !== id);
      }),

    // Read Status Actions
    markAsRead: (id) =>
      set((state) => {
        const notification = state.notifications.find((n) => n.id === id);
        if (notification && !notification.isRead) {
          notification.isRead = true;
          notification.readAt = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      }),

    markAllAsRead: () =>
      set((state) => {
        const now = new Date().toISOString();
        state.notifications.forEach((notification) => {
          if (!notification.isRead) {
            notification.isRead = true;
            notification.readAt = now;
          }
        });
        state.unreadCount = 0;
      }),

    // Unread Count Actions
    setUnreadCount: (count) =>
      set((state) => {
        state.unreadCount = count;
      }),

    incrementUnread: () =>
      set((state) => {
        state.unreadCount += 1;
      }),

    decrementUnread: () =>
      set((state) => {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }),

    // Pagination Actions
    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setHasMore: (hasMore) =>
      set((state) => {
        state.hasMore = hasMore;
      }),

    setPage: (page) =>
      set((state) => {
        state.page = page;
      }),

    nextPage: () =>
      set((state) => {
        state.page += 1;
      }),

    // Settings Actions
    setSoundEnabled: (enabled) =>
      set((state) => {
        state.soundEnabled = enabled;
      }),

    setDesktopEnabled: (enabled) =>
      set((state) => {
        state.desktopEnabled = enabled;
      }),

    // Reset
    reset: () => set(initialState),
  }))
);

// ============================================
// Notification Selectors
// ============================================

export const selectNotifications = (state: NotificationState) =>
  state.notifications;

export const selectUnreadNotifications = (state: NotificationState) =>
  state.notifications.filter((n) => !n.isRead);

export const selectUnreadCount = (state: NotificationState) =>
  state.unreadCount;

export const selectIsLoading = (state: NotificationState) => state.isLoading;

// Group notifications by date
export const selectGroupedNotifications = (state: NotificationState) => {
  const groups: Record<string, Notification[]> = {};
  
  state.notifications.forEach((notification) => {
    const date = new Date(notification.createdAt).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
  });
  
  return groups;
};
