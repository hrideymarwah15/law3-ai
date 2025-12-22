import { api } from "./client";
import type { ApiResponse, Review, Pagination } from "@/types";

// ============================================
// Backend Review Types
// ============================================

// What the backend actually returns for reviews
export interface BackendReview {
  id: string;
  user_name: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  is_verified: boolean;
}

// Backend response for reviews list
export interface BackendReviewsResponse {
  success: boolean;
  total: number;
  average_rating: number;
  reviews: BackendReview[];
}

// Transform backend review to frontend Review type
export function transformReview(backendReview: BackendReview): Review {
  const firstName = backendReview.user_name.split(' ')[0] || backendReview.user_name;
  const lastName = backendReview.user_name.split(' ').slice(1).join(' ') || '';
  
  return {
    id: backendReview.id,
    consultationId: '', // Not provided in list response
    userId: '', // Not provided in list response
    user: {
      id: '',
      firstName,
      lastName,
      email: '',
      fullName: backendReview.user_name,
      avatar: undefined,
      role: 'user',
      isVerified: false,
      isActive: true,
      preferredLanguage: 'en',
      createdAt: backendReview.created_at,
      updatedAt: backendReview.created_at,
    },
    lawyerId: '',
    rating: backendReview.rating,
    title: undefined,
    comment: backendReview.review_text || undefined,
    isAnonymous: backendReview.user_name === 'Anonymous',
    isVerified: backendReview.is_verified,
    helpfulCount: 0,
    lawyerResponse: undefined,
    createdAt: backendReview.created_at,
    updatedAt: backendReview.created_at,
  };
}

// ============================================
// Review API Service
// ============================================

export interface ReviewListResponse {
  reviews: Review[];
  pagination: Pagination;
  averageRating?: number;
  total?: number;
}

export interface CreateReviewData {
  consultationId: string;
  rating: number;
  title?: string;
  comment?: string;
  isAnonymous?: boolean;
}

export const reviewApi = {
  // List reviews for a lawyer - backend expects /reviews/lawyer/:lawyer_id
  list: (params?: {
    page?: number;
    limit?: number;
    lawyerId?: string;
    rating?: number;
    sortBy?: "recent" | "rating_high" | "rating_low" | "helpful";
  }) => {
    const { lawyerId, ...queryParams } = params || {};
    if (lawyerId) {
      return api.get<ApiResponse<ReviewListResponse>>(`/reviews/lawyer/${lawyerId}`, { params: queryParams });
    }
    return api.get<ApiResponse<ReviewListResponse>>("/reviews", { params: queryParams });
  },

  // Get review by ID
  getById: (id: string) =>
    api.get<ApiResponse<Review>>(`/reviews/${id}`),

  // Get review for consultation
  getByConsultation: (consultationId: string) =>
    api.get<ApiResponse<Review>>(`/reviews/consultation/${consultationId}`),

  // Create review
  create: (data: CreateReviewData) =>
    api.post<ApiResponse<Review>>("/reviews", data),

  // Update review
  update: (id: string, data: Partial<CreateReviewData>) =>
    api.patch<ApiResponse<Review>>(`/reviews/${id}`, data),

  // Delete review
  delete: (id: string) =>
    api.delete<ApiResponse<{ message: string }>>(`/reviews/${id}`),

  // Mark review as helpful
  markHelpful: (id: string) =>
    api.post<ApiResponse<{ helpfulCount: number }>>(`/reviews/${id}/helpful`),

  // Lawyer respond to review
  respond: (id: string, content: string) =>
    api.post<ApiResponse<Review>>(`/reviews/${id}/respond`, { content }),

  // Report review
  report: (id: string, reason: string) =>
    api.post<ApiResponse<{ message: string }>>(`/reviews/${id}/report`, {
      reason,
    }),

  // Get review stats for lawyer
  getStatsForLawyer: (lawyerId: string) =>
    api.get<
      ApiResponse<{
        averageRating: number;
        totalReviews: number;
        ratingDistribution: Record<number, number>;
        recentReviews: Review[];
      }>
    >(`/reviews/lawyer/${lawyerId}/stats`),
};
