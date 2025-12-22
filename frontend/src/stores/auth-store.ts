import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { User, Role } from "@/types";

// ============================================
// Auth Store Types
// ============================================

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface AuthState {
  // State
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (isLoading: boolean) => void;
  setInitialized: (isInitialized: boolean) => void;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  
  // Selectors (computed)
  isUser: () => boolean;
  isLawyer: () => boolean;
  isAdmin: () => boolean;
  hasRole: (role: Role) => boolean;
  isTokenExpired: () => boolean;
}

// ============================================
// Auth Store Implementation
// ============================================

export const useAuthStore = create<AuthState>()(
  persist(
    immer((set, get) => ({
      // Initial State
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,
      isInitialized: false,

      // Actions
      setUser: (user) =>
        set((state) => {
          state.user = user;
          state.isAuthenticated = !!user;
        }),

      setTokens: (tokens) =>
        set((state) => {
          state.tokens = tokens;
        }),

      setLoading: (isLoading) =>
        set((state) => {
          state.isLoading = isLoading;
        }),

      setInitialized: (isInitialized) =>
        set((state) => {
          state.isInitialized = isInitialized;
          state.isLoading = false;
        }),

      login: (user, tokens) =>
        set((state) => {
          state.user = user;
          state.tokens = tokens;
          state.isAuthenticated = true;
          state.isLoading = false;
        }),

      logout: () =>
        set((state) => {
          state.user = null;
          state.tokens = null;
          state.isAuthenticated = false;
        }),

      updateUser: (updates) =>
        set((state) => {
          if (state.user) {
            state.user = { ...state.user, ...updates };
          }
        }),

      // Selectors
      isUser: () => get().user?.role === "user",
      isLawyer: () => get().user?.role === "lawyer",
      isAdmin: () => get().user?.role === "admin",
      hasRole: (role) => get().user?.role === role,
      isTokenExpired: () => {
        const tokens = get().tokens;
        if (!tokens) return true;
        return Date.now() >= tokens.expiresAt;
      },
    })),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      // After hydration, set isLoading to false
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false;
          state.isInitialized = true;
        }
      },
    }
  )
);

// ============================================
// Auth Selectors (for performance)
// ============================================

export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectTokens = (state: AuthState) => state.tokens;
