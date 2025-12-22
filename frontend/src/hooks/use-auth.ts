'use client';

import { useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import { authApi, queryKeys, invalidateQueries } from '@/lib/api';
import { lawyerApi } from '@/lib/api/lawyer';
import type { 
  LoginFormData, 
  RegisterFormData,
  UserProfile,
} from '@/types';

// ============================================
// Auth Hook
// ============================================

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading: storeLoading,
    setUser,
    setTokens,
    logout: storeLogout,
    isUser,
    isLawyer,
    isAdmin,
  } = useAuthStore();

  // ============================================
  // Fetch Current User
  // ============================================

  const { 
    data: currentUser, 
    isLoading: userLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      const response = await authApi.me();
      return response.data;
    },
    enabled: !!tokens?.accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Sync user data from query to store
  useEffect(() => {
    if (currentUser && currentUser.id !== user?.id) {
      setUser(currentUser);
    }
  }, [currentUser, user?.id, setUser]);

  // ============================================
  // Login Mutation
  // ============================================

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginFormData) => {
      const response = await authApi.login(credentials);
      return response.data;
    },
    onSuccess: async (data) => {
      setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + data.expiresIn * 1000,
      });
      setUser(data.user);
      
      // Check for pending lawyer registration and submit it
      try {
        const pendingData = typeof window !== 'undefined' 
          ? sessionStorage.getItem('pendingLawyerRegistration') 
          : null;
        
        if (pendingData) {
          const lawyerData = JSON.parse(pendingData);
          
          // Transform frontend form data to backend format
          const registrationPayload = {
            bar_council_number: lawyerData.barCouncilNumber,
            bar_council_state: lawyerData.barCouncilState,
            bar_council_enrollment_date: lawyerData.barCouncilEnrollmentDate || undefined,
            specialization: lawyerData.specialization,
            experience_years: lawyerData.experienceYears,
            bio: lawyerData.bio,
            headline: lawyerData.headline || undefined,
            consultation_fee: lawyerData.consultationFee,
            office_city: lawyerData.officeCity,
            office_state: lawyerData.officeState,
            office_address: lawyerData.officeAddress || undefined,
            office_pincode: lawyerData.officePincode || undefined,
            education: lawyerData.education,
            languages_spoken: lawyerData.languagesSpoken,
            practice_areas: lawyerData.practiceAreas,
            courts_practiced: lawyerData.courtsPracticed || [],
            bar_council_certificate_url: lawyerData.barCouncilCertificateUrl,
            id_proof_type: lawyerData.idProofType,
            id_proof_url: lawyerData.idProofUrl,
            profile_photo_url: lawyerData.profilePhotoUrl || undefined,
          };

          await lawyerApi.submitRegistration(registrationPayload);
          sessionStorage.removeItem('pendingLawyerRegistration');
          console.log('Pending lawyer registration submitted successfully');
        }
      } catch (err) {
        console.error('Failed to submit pending lawyer registration:', err);
        // Don't fail login, user can try submitting again
      }
      
      // Redirect based on role
      const redirectPath = getDefaultRoute(data.user.role);
      router.push(redirectPath);
    },
    onError: () => {
      storeLogout();
    },
  });

  // ============================================
  // Register Mutation
  // ============================================

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const response = await authApi.register(data);
      return response.data;
    },
    onSuccess: (data) => {
      setUser(data.user);
      router.push('/login?registered=true');
    },
    onError: () => {
      storeLogout();
    },
  });

  // ============================================
  // Logout
  // ============================================

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      storeLogout();
      queryClient.clear();
      router.push('/');
    }
  }, [storeLogout, queryClient, router]);

  // ============================================
  // Password Management
  // ============================================

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await authApi.forgotPassword(email);
      return response.data;
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      const response = await authApi.resetPassword({ token, password });
      return response.data;
    },
    onSuccess: () => {
      router.push('/login?reset=success');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const response = await authApi.changePassword({ currentPassword, newPassword });
      return response.data;
    },
  });

  // ============================================
  // Email Verification
  // ============================================

  const verifyEmailMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await authApi.verifyEmail(token);
      return response.data;
    },
    onSuccess: () => {
      refetchUser();
    },
  });

  const resendVerificationMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await authApi.resendVerification(email);
      return response.data;
    },
  });

  // ============================================
  // Profile Management
  // ============================================

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const response = await authApi.updateProfile(data);
      return response.data;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      invalidateQueries.auth(queryClient);
    },
  });

  // ============================================
  // Helper Functions
  // ============================================

  const login = useCallback((credentials: LoginFormData) => {
    return loginMutation.mutateAsync(credentials);
  }, [loginMutation]);

  const register = useCallback((data: RegisterFormData) => {
    return registerMutation.mutateAsync(data);
  }, [registerMutation]);

  // ============================================
  // Route Guards
  // ============================================

  const requireAuth = useCallback(() => {
    if (!isAuthenticated && !storeLoading) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return false;
    }
    return true;
  }, [isAuthenticated, storeLoading, router, pathname]);

  const requireGuest = useCallback(() => {
    if (isAuthenticated && !storeLoading) {
      router.push(getDefaultRoute(user?.role || 'user'));
      return false;
    }
    return true;
  }, [isAuthenticated, storeLoading, router, user?.role]);

  const requireRole = useCallback((roles: string[]) => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return false;
    }
    if (user && !roles.includes(user.role)) {
      router.push('/unauthorized');
      return false;
    }
    return true;
  }, [isAuthenticated, user, router, pathname]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading: storeLoading || userLoading,
    tokens,
    
    // Role helpers
    isClient: isUser,
    isLawyer,
    isAdmin,
    
    // Actions
    login,
    register,
    logout,
    refetchUser,
    
    // Mutations for direct access
    loginMutation,
    registerMutation,
    forgotPasswordMutation,
    resetPasswordMutation,
    changePasswordMutation,
    verifyEmailMutation,
    resendVerificationMutation,
    updateProfileMutation,
    
    // Route guards
    requireAuth,
    requireGuest,
    requireRole,
  };
}

// ============================================
// Helper Functions
// ============================================

function getDefaultRoute(role: string): string {
  switch (role) {
    case 'lawyer':
      return '/lawyer/dashboard';
    case 'admin':
      return '/admin/dashboard';
    default:
      return '/dashboard';
  }
}

// ============================================
// Simplified Hooks
// ============================================

export function useUser() {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  return { user, isLoading };
}

export function useIsAuthenticated() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  return { isAuthenticated, isLoading };
}
