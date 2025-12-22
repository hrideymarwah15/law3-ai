import { api } from "./client";
import type {
  ApiResponse,
  Consultation,
  ConsultationType,
  ConsultationStatus,
  Pagination,
  BookConsultationFormData,
} from "@/types";

// ============================================
// Consultation API Service
// ============================================

export interface ConsultationListResponse {
  consultations: Consultation[];
  pagination: Pagination;
}

export interface ConsultationFilters {
  status?: ConsultationStatus | ConsultationStatus[];
  type?: ConsultationType;
  lawyerId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const consultationApi = {
  // List consultations (backend uses /my-consultations)
  list: (params?: ConsultationFilters) =>
    api.get<ApiResponse<ConsultationListResponse>>("/consultations/my-consultations", {
      params,
    }),

  // Get consultation by ID (backend uses :consultation_id)
  getById: (id: string) =>
    api.get<ApiResponse<Consultation>>(`/consultations/${id}`),

  // Get upcoming consultations (backend uses /upcoming-video)
  getUpcoming: () =>
    api.get<ApiResponse<{ consultations: Consultation[] }>>(
      "/consultations/upcoming-video"
    ),

  // Get consultation history
  getHistory: (params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<ConsultationListResponse>>("/consultations/my-consultations", {
      params: { ...params, status: 'completed' },
    }),

  // Book consultation (backend uses /book)
  book: (data: BookConsultationFormData) =>
    api.post<ApiResponse<Consultation>>("/consultations/book", data),

  // Update consultation
  update: (id: string, data: Partial<Consultation>) =>
    api.patch<ApiResponse<Consultation>>(`/consultations/${id}`, data),

  // Cancel consultation (backend uses PUT)
  cancel: (id: string, reason?: string) =>
    api.put<ApiResponse<Consultation>>(`/consultations/${id}/cancel`, {
      cancellation_reason: reason,
    }),

  // Reschedule consultation (backend uses PUT)
  reschedule: (id: string, data: { date: string; time: string }) =>
    api.put<ApiResponse<Consultation>>(`/consultations/${id}/reschedule`, {
      new_date: data.date,
      new_start_time: data.time,
      reschedule_reason: 'Schedule change requested',
    }),

  // Confirm consultation (lawyer)
  confirm: (id: string) =>
    api.post<ApiResponse<Consultation>>(`/consultations/${id}/confirm`),

  // Start consultation
  start: (id: string) =>
    api.post<ApiResponse<Consultation>>(`/consultations/${id}/start`),

  // End consultation
  end: (id: string, data?: { notes?: string }) =>
    api.post<ApiResponse<Consultation>>(`/consultations/${id}/end`, data),

  // Add notes (lawyer)
  addNotes: (id: string, notes: string) =>
    api.post<ApiResponse<Consultation>>(`/consultations/${id}/notes`, { notes }),

  // Get meeting link
  getMeetingLink: (id: string) =>
    api.get<ApiResponse<{ link: string; token: string }>>(
      `/consultations/${id}/meeting`
    ),

  // Get consultation stats
  getStats: () =>
    api.get<
      ApiResponse<{
        total: number;
        pending: number;
        confirmed: number;
        completed: number;
        cancelled: number;
        byType: Record<ConsultationType, number>;
        byStatus: Record<ConsultationStatus, number>;
      }>
    >("/consultations/stats"),
};
