"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";
import { isApiError, getApiErrorMessage } from "./client";

// ============================================
// Query Client Configuration
// ============================================

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time - how long data is considered fresh
        staleTime: 60 * 1000, // 1 minute
        
        // Cache time - how long to keep data in cache after becoming inactive
        gcTime: 5 * 60 * 1000, // 5 minutes
        
        // Retry configuration
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (isApiError(error) && error.response?.status) {
            const status = error.response.status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Refetch configuration
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        
        // Network mode - always fetch, don't use cache when offline
        networkMode: "always",
      },
      mutations: {
        // Retry configuration for mutations
        retry: false,
        
        // Network mode
        networkMode: "always",
        
        // Error handling
        onError: (error) => {
          const message = getApiErrorMessage(error);
          console.error("Mutation error:", message);
        },
      },
    },
  });
}

// Singleton for SSR
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new query client
    return makeQueryClient();
  } else {
    // Browser: use singleton pattern
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

// ============================================
// Query Client Provider
// ============================================

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}

// ============================================
// Query Keys Factory
// ============================================

export const queryKeys = {
  // Auth
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
    profile: () => [...queryKeys.auth.all, "profile"] as const,
  },

  // Users
  users: {
    all: ["users"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.users.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.users.all, "detail", id] as const,
  },

  // Lawyers
  lawyers: {
    all: ["lawyers"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.lawyers.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.lawyers.all, "detail", id] as const,
    reviews: (id: string) =>
      [...queryKeys.lawyers.all, "reviews", id] as const,
    availability: (id: string, date?: string) =>
      [...queryKeys.lawyers.all, "availability", id, date] as const,
    featured: () => [...queryKeys.lawyers.all, "featured"] as const,
    search: (query: string) =>
      [...queryKeys.lawyers.all, "search", query] as const,
  },

  // Consultations
  consultations: {
    all: ["consultations"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.consultations.all, "list", filters] as const,
    detail: (id: string) =>
      [...queryKeys.consultations.all, "detail", id] as const,
    upcoming: () => [...queryKeys.consultations.all, "upcoming"] as const,
    history: () => [...queryKeys.consultations.all, "history"] as const,
    stats: () => [...queryKeys.consultations.all, "stats"] as const,
  },

  // Chat
  chat: {
    all: ["chat"] as const,
    rooms: () => [...queryKeys.chat.all, "rooms"] as const,
    room: (id: string) => [...queryKeys.chat.all, "room", id] as const,
    messages: (roomId: string) =>
      [...queryKeys.chat.all, "messages", roomId] as const,
  },

  // Notifications
  notifications: {
    all: ["notifications"] as const,
    list: (page?: number) =>
      [...queryKeys.notifications.all, "list", page] as const,
    unreadCount: () =>
      [...queryKeys.notifications.all, "unread-count"] as const,
  },

  // Reviews
  reviews: {
    all: ["reviews"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.reviews.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.reviews.all, "detail", id] as const,
  },

  // Payments
  payments: {
    all: ["payments"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.payments.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.payments.all, "detail", id] as const,
  },

  // Practice Areas
  practiceAreas: {
    all: ["practice-areas"] as const,
    list: () => [...queryKeys.practiceAreas.all, "list"] as const,
  },

  // Dashboard
  dashboard: {
    all: ["dashboard"] as const,
    stats: () => [...queryKeys.dashboard.all, "stats"] as const,
    activity: () => [...queryKeys.dashboard.all, "activity"] as const,
    earnings: (period?: string) =>
      [...queryKeys.dashboard.all, "earnings", period] as const,
  },

  // AI Chat
  aiChat: {
    all: ["ai-chat"] as const,
    session: (id: string) => [...queryKeys.aiChat.all, "session", id] as const,
    history: () => [...queryKeys.aiChat.all, "history"] as const,
  },
} as const;

// ============================================
// Invalidation Helpers
// ============================================

export const invalidateQueries = {
  auth: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.auth.all });
  },
  users: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
  },
  lawyers: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.lawyers.all });
  },
  consultations: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.consultations.all });
  },
  notifications: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
  },
  dashboard: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  },
};

export { getQueryClient };
