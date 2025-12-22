import { api } from "./client";
import type {
  ApiResponse,
  User,
  UserProfile,
  LoginFormData,
  RegisterFormData,
} from "@/types";

// ============================================
// Backend Response Types
// ============================================

// Backend signin response format (snake_case)
interface BackendSigninResponse {
  success: boolean;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    is_verified: boolean;
  };
}

// Backend signup response format
interface BackendSignupResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
  };
}

// Backend me response format
interface BackendMeResponse {
  success: boolean;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    role: string;
    status: string;
    city: string | null;
    state: string | null;
    preferred_language: string;
    is_email_verified: boolean;
    is_phone_verified: boolean;
    avatar_url: string | null;
    created_at: string;
  };
}

// Transform backend user to frontend User format
function transformBackendUser(backendUser: BackendSigninResponse['user']): User {
  return {
    id: backendUser.id,
    email: backendUser.email || '',
    phone: backendUser.phone || undefined,
    firstName: backendUser.first_name || '',
    lastName: backendUser.last_name || '',
    fullName: `${backendUser.first_name || ''} ${backendUser.last_name || ''}`.trim() || 'User',
    avatar: undefined,
    role: backendUser.role as 'user' | 'lawyer' | 'admin',
    isVerified: backendUser.is_verified || false,
    isActive: true,
    preferredLanguage: 'en',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Transform backend me response to frontend User format
function transformBackendMeUser(backendUser: BackendMeResponse['user']): User {
  return {
    id: backendUser.id,
    email: backendUser.email || '',
    phone: backendUser.phone || undefined,
    firstName: backendUser.first_name || '',
    lastName: backendUser.last_name || '',
    fullName: `${backendUser.first_name || ''} ${backendUser.last_name || ''}`.trim() || 'User',
    avatar: backendUser.avatar_url || undefined,
    role: backendUser.role as 'user' | 'lawyer' | 'admin',
    isVerified: backendUser.is_email_verified || backendUser.is_phone_verified,
    isActive: backendUser.status === 'active',
    preferredLanguage: backendUser.preferred_language as 'en' | 'hi',
    createdAt: backendUser.created_at,
    updatedAt: backendUser.created_at,
  };
}

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
  // Login (backend uses /signin) - transforms backend response to frontend format
  login: async (data: LoginFormData): Promise<{ data: LoginResponse }> => {
    const response = await api.post<BackendSigninResponse>("/auth/signin", data);
    const backendData = response as unknown as BackendSigninResponse;
    
    if (backendData.success && backendData.session && backendData.user) {
      return {
        data: {
          user: transformBackendUser(backendData.user),
          accessToken: backendData.session.access_token,
          refreshToken: backendData.session.refresh_token,
          expiresIn: Math.floor((backendData.session.expires_at * 1000 - Date.now()) / 1000),
        }
      };
    }
    throw new Error('Login failed');
  },

  // Register (backend uses /signup) - transforms backend response
  register: async (data: RegisterFormData): Promise<{ data: RegisterResponse }> => {
    // Format phone number to +91XXXXXXXXXX format
    let formattedPhone = data.phone;
    if (formattedPhone) {
      const digits = formattedPhone.replace(/\D/g, '');
      if (digits.length === 10 && /^[6-9]/.test(digits)) {
        formattedPhone = '+91' + digits;
      } else if (digits.startsWith('91') && digits.length === 12) {
        formattedPhone = '+' + digits;
      }
    }

    // Convert frontend format to backend format
    const backendData = {
      email: data.email,
      phone: formattedPhone,
      password: data.password,
      first_name: data.firstName,
      last_name: data.lastName,
      signup_method: 'email',
    };
    
    try {
      const response = await api.post<BackendSignupResponse>("/auth/signup", backendData);
      const result = response as unknown as BackendSignupResponse;
      
      if (result.success) {
        return {
          data: {
            user: {
              id: result.user.id,
              email: result.user.email || '',
              phone: result.user.phone || undefined,
              firstName: data.firstName,
              lastName: data.lastName,
              fullName: `${data.firstName} ${data.lastName}`.trim(),
              role: data.role as 'user' | 'lawyer',
              isVerified: false,
              isActive: true,
              preferredLanguage: 'en',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            message: result.message,
          }
        };
      }
      throw new Error('Registration failed');
    } catch (error: unknown) {
      // Extract detailed error message from backend
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: { message?: string; details?: Array<{ message: string }> } } } };
        const backendError = axiosError.response?.data?.error;
        if (backendError) {
          const message = backendError.details?.[0]?.message || backendError.message || 'Registration failed';
          throw new Error(message);
        }
      }
      throw error;
    }
  },

  // Logout (backend uses /signout)
  logout: () => api.post<ApiResponse<{ message: string }>>("/auth/signout"),

  // Get current user - transforms backend response
  me: async (): Promise<{ data: User }> => {
    const response = await api.get<BackendMeResponse>("/auth/me");
    const result = response as unknown as BackendMeResponse;
    
    if (result.success && result.user) {
      return { data: transformBackendMeUser(result.user) };
    }
    throw new Error('Failed to get user');
  },

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

  // OAuth (Google/Apple) - initiates OAuth flow
  initiateOAuth: (provider: 'google' | 'apple', redirectUrl: string) =>
    api.post<{ success: boolean; url: string }>("/auth/signin/oauth", {
      provider,
      redirect_url: redirectUrl,
    }),

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
