import { api } from "./client";
import type { ApiResponse, Payment, PaymentStatus, Pagination } from "@/types";

// ============================================
// Payment API Service
// ============================================

export interface PaymentListResponse {
  payments: Payment[];
  pagination: Pagination;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
}

export interface VerifyPaymentData {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export const paymentApi = {
  // List payments - may not exist in current backend, using consultations endpoint
  list: (params?: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    startDate?: string;
    endDate?: string;
  }) =>
    api.get<ApiResponse<PaymentListResponse>>("/consultations/my-consultations", { 
      params: { ...params, include_payments: true } 
    }),

  // Get payment by ID - may need consultation ID instead
  getById: (id: string) =>
    api.get<ApiResponse<Payment>>(`/consultations/${id}`),

  // Create order for consultation (handled via book endpoint)
  createOrder: (consultationId: string) =>
    api.post<ApiResponse<CreateOrderResponse>>("/consultations/book", {
      consultation_id: consultationId,
    }),

  // Verify/Confirm payment (backend uses /consultations/:id/confirm-payment)
  verifyPayment: (data: VerifyPaymentData & { consultationId: string }) =>
    api.post<ApiResponse<Payment>>(`/consultations/${data.consultationId}/confirm-payment`, {
      razorpay_order_id: data.razorpay_order_id,
      razorpay_payment_id: data.razorpay_payment_id,
      razorpay_signature: data.razorpay_signature,
    }),

  // Get payment for consultation
  getByConsultation: (consultationId: string) =>
    api.get<ApiResponse<Payment>>(`/payments/consultation/${consultationId}`),

  // Request refund
  requestRefund: (paymentId: string, reason: string) =>
    api.post<ApiResponse<Payment>>(`/payments/${paymentId}/refund`, { reason }),

  // Get payment stats (admin/lawyer)
  getStats: (params?: { startDate?: string; endDate?: string }) =>
    api.get<
      ApiResponse<{
        totalAmount: number;
        totalPayments: number;
        pendingAmount: number;
        completedAmount: number;
        refundedAmount: number;
        byStatus: Record<PaymentStatus, { count: number; amount: number }>;
      }>
    >("/payments/stats", { params }),

  // Download invoice
  downloadInvoice: (paymentId: string) =>
    api.get<Blob>(`/payments/${paymentId}/invoice`, {
      responseType: "blob",
    }),
};
