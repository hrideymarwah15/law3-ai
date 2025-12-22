import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Language } from "@/types";

// ============================================
// UI Store Types
// ============================================

type Theme = "light" | "dark" | "system";

interface ModalState {
  isOpen: boolean;
  type: string | null;
  data?: Record<string, unknown>;
}

interface UIState {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Mobile Menu
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  
  // Language
  language: Language;
  setLanguage: (language: Language) => void;
  
  // Modal Management
  modal: ModalState;
  openModal: (type: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  
  // Command Palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  
  // Search
  searchOpen: boolean;
  searchQuery: string;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  
  // Notifications Panel
  notificationsPanelOpen: boolean;
  setNotificationsPanelOpen: (open: boolean) => void;
  
  // Global Loading
  globalLoading: boolean;
  globalLoadingMessage: string;
  setGlobalLoading: (loading: boolean, message?: string) => void;
  
  // Scroll Position (for infinite scroll, etc.)
  scrollPositions: Record<string, number>;
  setScrollPosition: (key: string, position: number) => void;
  getScrollPosition: (key: string) => number;
  
  // Breadcrumbs
  breadcrumbs: { label: string; href?: string }[];
  setBreadcrumbs: (breadcrumbs: { label: string; href?: string }[]) => void;
}

// ============================================
// UI Store Implementation
// ============================================

export const useUIStore = create<UIState>()(
  immer((set, get) => ({
    // Theme
    theme: "light",
    setTheme: (theme) =>
      set((state) => {
        state.theme = theme;
      }),

    // Sidebar
    sidebarOpen: true,
    sidebarCollapsed: false,
    toggleSidebar: () =>
      set((state) => {
        state.sidebarOpen = !state.sidebarOpen;
      }),
    setSidebarOpen: (open) =>
      set((state) => {
        state.sidebarOpen = open;
      }),
    setSidebarCollapsed: (collapsed) =>
      set((state) => {
        state.sidebarCollapsed = collapsed;
      }),

    // Mobile Menu
    mobileMenuOpen: false,
    setMobileMenuOpen: (open) =>
      set((state) => {
        state.mobileMenuOpen = open;
      }),

    // Language
    language: "en",
    setLanguage: (language) =>
      set((state) => {
        state.language = language;
      }),

    // Modal
    modal: {
      isOpen: false,
      type: null,
      data: undefined,
    },
    openModal: (type, data) =>
      set((state) => {
        state.modal = { isOpen: true, type, data };
      }),
    closeModal: () =>
      set((state) => {
        state.modal = { isOpen: false, type: null, data: undefined };
      }),

    // Command Palette
    commandPaletteOpen: false,
    setCommandPaletteOpen: (open) =>
      set((state) => {
        state.commandPaletteOpen = open;
      }),

    // Search
    searchOpen: false,
    searchQuery: "",
    setSearchOpen: (open) =>
      set((state) => {
        state.searchOpen = open;
        if (!open) state.searchQuery = "";
      }),
    setSearchQuery: (query) =>
      set((state) => {
        state.searchQuery = query;
      }),

    // Notifications Panel
    notificationsPanelOpen: false,
    setNotificationsPanelOpen: (open) =>
      set((state) => {
        state.notificationsPanelOpen = open;
      }),

    // Global Loading
    globalLoading: false,
    globalLoadingMessage: "",
    setGlobalLoading: (loading, message = "") =>
      set((state) => {
        state.globalLoading = loading;
        state.globalLoadingMessage = message;
      }),

    // Scroll Positions
    scrollPositions: {},
    setScrollPosition: (key, position) =>
      set((state) => {
        state.scrollPositions[key] = position;
      }),
    getScrollPosition: (key) => get().scrollPositions[key] || 0,

    // Breadcrumbs
    breadcrumbs: [],
    setBreadcrumbs: (breadcrumbs) =>
      set((state) => {
        state.breadcrumbs = breadcrumbs;
      }),
  }))
);

// ============================================
// UI Selectors
// ============================================

export const selectTheme = (state: UIState) => state.theme;
export const selectSidebarOpen = (state: UIState) => state.sidebarOpen;
export const selectLanguage = (state: UIState) => state.language;
export const selectModal = (state: UIState) => state.modal;
export const selectGlobalLoading = (state: UIState) => state.globalLoading;
