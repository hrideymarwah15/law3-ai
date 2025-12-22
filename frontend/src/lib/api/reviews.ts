import { api } from "./client";
import type { ApiResponse, Review, Pagination } from "@/types";

// ============================================
// Review API Service
// ============================================

export interface ReviewListResponse {
  reviews: Review[];
  pagination: Pagination;
}

export interface CreateReviewData {
  consultationId: string;
  rating: number;
  title?: string;
  comment?: string;
  isAnonymous?: boolean;
}

export const reviewApi = {
  // List reviews
  list: (params?: {
    page?: number;
    limit?: number;
    lawyerId?: string;
    rating?: number;
    sortBy?: "recent" | "rating_high" | "rating_low" | "helpful";
  }) =>
    api.get<ApiResponse<ReviewListResponse>>("/reviews", { params }),

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
