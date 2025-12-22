// Export API client and helpers
export { default as apiClient, api, uploadFile, isApiError, getApiErrorMessage, getApiErrorDetails } from "./client";

// Export Query Client and Provider
export { QueryProvider, queryKeys, invalidateQueries, getQueryClient } from "./query-client";

// Export API services
export { authApi } from "./auth";
export type { LoginResponse, RegisterResponse, VerifyEmailResponse, ForgotPasswordResponse, ResetPasswordResponse } from "./auth";

export { lawyerApi, transformLawyer, transformLawyerDetail } from "./lawyers";
export type { LawyerListResponse, LawyerReviewsResponse, LawyerSearchResponse, LawyerDetailResponse, BackendLawyer, BackendLawyerDetail } from "./lawyers";

// Lawyer registration API
export { lawyerApi as lawyerRegistrationApi } from "./lawyer";
export type { 
  LawyerProfile, 
  LawyerSearchParams, 
  LawyerRegistrationData, 
  RegistrationStatus,
  AvailabilitySlot 
} from "./lawyer";

export { consultationApi } from "./consultations";
export type { ConsultationListResponse, ConsultationFilters } from "./consultations";

export { chatApi } from "./chat";
export type { ChatRoomListResponse, ChatMessageListResponse } from "./chat";

export { notificationApi } from "./notifications";
export type { NotificationListResponse } from "./notifications";

export { paymentApi } from "./payments";
export type { PaymentListResponse, CreateOrderResponse, VerifyPaymentData } from "./payments";

export { reviewApi, transformReview } from "./reviews";
export type { ReviewListResponse, CreateReviewData, BackendReview, BackendReviewsResponse } from "./reviews";
