import { api } from "./client";
import type {
  ApiResponse,
  LawyerProfile,
  LawyerSearchFilters,
  Review,
  ConsultationSlot,
  Pagination,
} from "@/types";

// ============================================
// Lawyer API Service
// ============================================

export interface LawyerListResponse {
  lawyers: LawyerProfile[];
  pagination: Pagination;
}

export interface LawyerReviewsResponse {
  reviews: Review[];
  pagination: Pagination;
  stats: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
  };
}

export const lawyerApi = {
  // Search/List lawyers
  list: (params?: LawyerSearchFilters & { page?: number; limit?: number }) =>
    api.get<ApiResponse<LawyerListResponse>>("/lawyers", { params }),

  // Get featured lawyers
  getFeatured: () =>
    api.get<ApiResponse<{ lawyers: LawyerProfile[] }>>("/lawyers/featured"),

  // Get lawyer by ID
  getById: (id: string) =>
    api.get<ApiResponse<LawyerProfile>>(`/lawyers/${id}`),

  // Get lawyer by user ID
  getByUserId: (userId: string) =>
    api.get<ApiResponse<LawyerProfile>>(`/lawyers/user/${userId}`),

  // Get lawyer reviews
  getReviews: (
    id: string,
    params?: { page?: number; limit?: number; sortBy?: string }
  ) =>
    api.get<ApiResponse<LawyerReviewsResponse>>(`/lawyers/${id}/reviews`, {
      params,
    }),

  // Get lawyer availability
  getAvailability: (id: string, params?: { date?: string; days?: number }) =>
    api.get<ApiResponse<{ slots: ConsultationSlot[] }>>(
      `/lawyers/${id}/availability`,
      { params }
    ),

  // Get practice areas
  getPracticeAreas: () =>
    api.get<
      ApiResponse<{ practiceAreas: { id: string; name: string; slug: string }[] }>
    >("/lawyers/practice-areas"),

  // Update lawyer profile (for lawyers)
  updateProfile: (data: Partial<LawyerProfile>) =>
    api.patch<ApiResponse<LawyerProfile>>("/lawyers/profile", data),

  // Update availability (for lawyers)
  updateAvailability: (
    data: Array<{
      dayOfWeek: number;
      slots: Array<{ startTime: string; endTime: string; isAvailable: boolean }>;
    }>
  ) =>
    api.put<ApiResponse<{ message: string }>>("/lawyers/availability", {
      schedule: data,
    }),

  // Toggle online status (for lawyers)
  toggleAvailability: (isAvailable: boolean) =>
    api.patch<ApiResponse<{ isAvailable: boolean }>>("/lawyers/availability/toggle", {
      isAvailable,
    }),

  // Get lawyer stats (for lawyers)
  getStats: () =>
    api.get<
      ApiResponse<{
        totalConsultations: number;
        completedConsultations: number;
        totalEarnings: number;
        averageRating: number;
        totalReviews: number;
      }>
    >("/lawyers/stats"),

  // Get lawyer earnings (for lawyers)
  getEarnings: (params?: { startDate?: string; endDate?: string }) =>
    api.get<
      ApiResponse<{
        total: number;
        pending: number;
        data: Array<{ date: string; amount: number; consultations: number }>;
      }>
    >("/lawyers/earnings", { params }),

  // Verify lawyer (admin only)
  verify: (id: string, data: { status: "verified" | "rejected"; reason?: string }) =>
    api.post<ApiResponse<LawyerProfile>>(`/lawyers/${id}/verify`, data),
};
