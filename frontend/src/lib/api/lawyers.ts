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

// Backend raw lawyer format from search endpoint
export interface BackendLawyer {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  city: string | null;
  profile_photo_url: string | null;
  specialization: string;
  experience_years: number;
  consultation_fee: number;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  bio: string | null;
  // Optional fields that may be present in detail view
  bar_council_number?: string;
  total_consultations?: number;
}

// Backend detail response - includes more fields
export interface BackendLawyerDetail extends BackendLawyer {
  email?: string;
  reviews?: Array<{
    id: string;
    user_name: string;
    rating: number;
    review_text: string;
    created_at: string;
  }>;
}

// Backend single lawyer response format
export interface LawyerDetailResponse {
  success: boolean;
  lawyer: BackendLawyerDetail;
  cached?: boolean;
}

// Backend response format: { success, total, page, limit, lawyers }
export interface LawyerSearchResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  lawyers: BackendLawyer[];
  cached?: boolean;
}

// Transform backend lawyer to frontend format
export function transformLawyer(backend: BackendLawyer): LawyerProfile {
  const firstName = backend.first_name || '';
  const lastName = backend.last_name || '';
  
  return {
    id: backend.id,
    userId: '',
    user: {
      id: '',
      email: '',
      firstName,
      lastName,
      fullName: backend.display_name || `${firstName} ${lastName}`.trim(),
      role: 'lawyer',
      avatar: backend.profile_photo_url || undefined,
      phone: '',
      isVerified: true,
      isActive: true,
      preferredLanguage: 'en',
      createdAt: '',
      updatedAt: '',
    },
    barCouncilId: backend.bar_council_number || '',
    barCouncilState: backend.city || '',
    enrollmentYear: 0,
    yearsOfExperience: backend.experience_years || 0,
    practiceAreas: backend.specialization ? [{ id: backend.specialization, name: backend.specialization, slug: backend.specialization }] : [],
    courts: [],
    languages: [],
    bio: backend.bio || '',
    education: [],
    experience: [],
    consultationFee: backend.consultation_fee || 0,
    consultationDuration: 30,
    rating: backend.rating || 0,
    totalReviews: backend.total_reviews || 0,
    totalConsultations: backend.total_consultations || 0,
    verificationStatus: 'verified',
    isAvailable: backend.is_available || false,
    createdAt: '',
    updatedAt: '',
  };
}

// Transform backend detail lawyer to frontend format (with additional fields)
export function transformLawyerDetail(backend: BackendLawyerDetail): LawyerProfile {
  return {
    ...transformLawyer(backend),
    barCouncilId: backend.bar_council_number || '',
    totalConsultations: backend.total_consultations || 0,
  };
}

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
  // Search/List lawyers - returns backend format directly
  list: (params?: LawyerSearchFilters & { page?: number; limit?: number }) =>
    api.get<LawyerSearchResponse>("/lawyers/search", { params }),

  // Get featured lawyers
  getFeatured: () =>
    api.get<ApiResponse<{ lawyers: LawyerProfile[] }>>("/lawyers/featured"),

  // Get lawyer by ID - backend returns { success, lawyer }
  getById: (id: string) =>
    api.get<LawyerDetailResponse>(`/lawyers/${id}`),

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
