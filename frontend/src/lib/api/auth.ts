import { api } from "./client";
import type {
  ApiResponse,
  User,
  UserProfile,
  LoginFormData,
  RegisterFormData,
} from "@/types";

// ============================================
// Auth API Service
// ============================================

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export const authApi = {
  // Login
  login: (data: LoginFormData) =>
    api.post<ApiResponse<LoginResponse>>("/auth/login", data),

  // Register
  register: (data: RegisterFormData) =>
    api.post<ApiResponse<RegisterResponse>>("/auth/register", data),

  // Logout
  logout: () => api.post<ApiResponse<{ message: string }>>("/auth/logout"),

  // Get current user
  me: () => api.get<ApiResponse<User>>("/auth/me"),

  // Get user profile
  getProfile: () => api.get<ApiResponse<UserProfile>>("/auth/profile"),

  // Update profile
  updateProfile: (data: Partial<UserProfile>) =>
    api.patch<ApiResponse<UserProfile>>("/auth/profile", data),

  // Change password
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<ApiResponse<{ message: string }>>("/auth/change-password", data),

  // Verify email
  verifyEmail: (token: string) =>
    api.post<ApiResponse<VerifyEmailResponse>>("/auth/verify-email", { token }),

  // Resend verification email
  resendVerification: (email: string) =>
    api.post<ApiResponse<{ message: string }>>("/auth/resend-verification", {
      email,
    }),

  // Forgot password
  forgotPassword: (email: string) =>
    api.post<ApiResponse<ForgotPasswordResponse>>("/auth/forgot-password", {
      email,
    }),

  // Reset password
  resetPassword: (data: { token: string; password: string }) =>
    api.post<ApiResponse<ResetPasswordResponse>>("/auth/reset-password", data),

  // Refresh token
  refreshToken: (refreshToken: string) =>
    api.post<
      ApiResponse<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
      }>
    >("/auth/refresh", { refreshToken }),

  // Google OAuth
  googleAuth: (idToken: string) =>
    api.post<ApiResponse<LoginResponse>>("/auth/google", { idToken }),

  // Upload avatar
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);
    return api.post<ApiResponse<{ url: string }>>("/auth/avatar", formData);
  },

  // Delete account
  deleteAccount: (password: string) =>
    api.delete<ApiResponse<{ message: string }>>("/auth/account", {
      data: { password },
    }),
};
