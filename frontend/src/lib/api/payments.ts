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
  // List payments
  list: (params?: {
    page?: number;
    limit?: number;
    status?: PaymentStatus;
    startDate?: string;
    endDate?: string;
  }) =>
    api.get<ApiResponse<PaymentListResponse>>("/payments", { params }),

  // Get payment by ID
  getById: (id: string) =>
    api.get<ApiResponse<Payment>>(`/payments/${id}`),

  // Create order for consultation
  createOrder: (consultationId: string) =>
    api.post<ApiResponse<CreateOrderResponse>>("/payments/create-order", {
      consultationId,
    }),

  // Verify payment
  verifyPayment: (data: VerifyPaymentData & { consultationId: string }) =>
    api.post<ApiResponse<Payment>>("/payments/verify", data),

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
