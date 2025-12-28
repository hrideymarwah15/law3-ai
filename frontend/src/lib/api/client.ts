import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { config } from "@/config";
import { useAuthStore } from "@/stores/auth-store";

// ============================================
// Types
// ============================================

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// ============================================
// Create Axios Instance
// ============================================

const apiClient: AxiosInstance = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ============================================
// Request Interceptor
// ============================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { tokens } = useAuthStore.getState();
    
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    
    // Add language header
    const language = localStorage.getItem("language") || "en";
    config.headers["Accept-Language"] = language;
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ============================================
// Response Interceptor
// ============================================

apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle network errors (no response)
    if (!error.response) {
      const networkError = {
        url: originalRequest?.url || 'unknown',
        method: originalRequest?.method || 'unknown',
        message: error.message || 'Network error',
        code: error.code || 'NETWORK_ERROR',
        isNetworkError: true,
      };
      
      if (process.env.NODE_ENV === "development") {
        console.error("API Network Error:", networkError);
      }
      
      // Create a more descriptive error
      const enhancedError = new Error(
        error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK'
          ? 'Unable to connect to server. Please check if the backend is running.'
          : error.message || 'Network error occurred'
      );
      (enhancedError as Error & { isNetworkError: boolean }).isNetworkError = true;
      return Promise.reject(enhancedError);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      const { tokens, logout } = useAuthStore.getState();

      // If no refresh token, logout
      if (!tokens?.refreshToken) {
        logout();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post<{ success: boolean; session: { access_token: string; refresh_token: string; expires_at: number } }>(
          `${config.api.baseUrl}/auth/refresh`,
          { refresh_token: tokens.refreshToken }
        );

        const { access_token, refresh_token, expires_at } = response.data.session;
        const newTokens = {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: expires_at * 1000,
        };

        useAuthStore.getState().setTokens(newTokens);
        processQueue(null, access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors with response
    const errorMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";

    // Log detailed error in development
    if (process.env.NODE_ENV === "development") {
      console.error("API Error:", {
        url: originalRequest?.url || 'unknown',
        method: originalRequest?.method || 'unknown',
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: errorMessage,
        data: error.response?.data,
        code: error.code,
      });
    }

    return Promise.reject(error);
  }
);

// ============================================
// API Helper Functions
// ============================================

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
};

// ============================================
// Upload Helper
// ============================================

export const uploadFile = async (
  url: string,
  file: File,
  onProgress?: (progress: number) => void
) => {
  const formData = new FormData();
  formData.append("file", file);

  return apiClient.post(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(progress);
      }
    },
  });
};

// ============================================
// Error Helpers
// ============================================

export const isApiError = (error: unknown): error is AxiosError<ApiErrorResponse> => {
  return axios.isAxiosError(error);
};

export const getApiErrorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    return (
      error.response?.data?.error?.message ||
      error.message ||
      "An unexpected error occurred"
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
};

export const getApiErrorDetails = (error: unknown): Record<string, string[]> | undefined => {
  if (isApiError(error)) {
    return error.response?.data?.error?.details;
  }
  return undefined;
};

export default apiClient;
