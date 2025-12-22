'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Spinner, useToast } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { config } from '@/config';
import type { User } from '@/types';
import { lawyerApi } from '@/lib/api/lawyer';

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
function transformBackendUser(backendUser: BackendMeResponse['user']): User {
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

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Completing sign in...');

  // Function to submit pending lawyer registration
  const submitPendingLawyerRegistration = async () => {
    try {
      const pendingData = sessionStorage.getItem('pendingLawyerRegistration');
      if (!pendingData) return null;

      setStatusMessage('Submitting lawyer registration...');
      
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
      
      // Clear the pending registration data
      sessionStorage.removeItem('pendingLawyerRegistration');
      
      return true;
    } catch (err) {
      console.error('Failed to submit lawyer registration:', err);
      // Don't fail login if lawyer registration fails - user can try again
      return false;
    }
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL query params
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        
        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }

        // Get the hash fragment which contains the tokens from Supabase
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          
          // Check for error in hash fragment (Supabase sends errors in hash)
          const hashError = params.get('error');
          const hashErrorCode = params.get('error_code');
          const hashErrorDescription = params.get('error_description');
          
          if (hashError) {
            // Map common Supabase error codes to user-friendly messages
            let errorMessage = hashErrorDescription?.replace(/\+/g, ' ') || hashError;
            
            if (hashErrorCode === 'otp_expired') {
              errorMessage = 'The verification link has expired. Please request a new one by registering again or using "Forgot Password".';
            } else if (hashErrorCode === 'access_denied') {
              errorMessage = 'Access was denied. Please try signing in again.';
            }
            
            throw new Error(errorMessage);
          }
          
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const expiresInStr = params.get('expires_in');
          const expiresIn = expiresInStr ? parseInt(expiresInStr, 10) : 3600;

          if (accessToken && refreshToken) {
            // Calculate expiration time
            const expiresAt = Date.now() + (expiresIn * 1000);
            
            // Fetch user info using direct axios call with token
            try {
              const response = await axios.get<BackendMeResponse>(
                `${config.api.baseUrl}/auth/me`,
                {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              
              if (response.data.success && response.data.user) {
                const user = transformBackendUser(response.data.user);
                
                // Use the login action to properly set state
                login(user, { accessToken, refreshToken, expiresAt });
                
                // Check for pending lawyer registration and submit it
                const lawyerSubmitted = await submitPendingLawyerRegistration();
                
                if (lawyerSubmitted) {
                  toast({ 
                    title: 'Success', 
                    description: 'Signed in! Your lawyer registration has been submitted for review.', 
                    variant: 'success' 
                  });
                } else {
                  toast({ title: 'Success', description: 'Successfully signed in!', variant: 'success' });
                }
                
                router.replace('/dashboard');
                return;
              }
            } catch (fetchErr) {
              console.log('User fetch failed, trying sync-profile...', fetchErr);
              // User might not have a profile yet, need to sync
              try {
                await axios.post(
                  `${config.api.baseUrl}/auth/sync-profile`,
                  {},
                  {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );
                
                // Try getting user again
                const response = await axios.get<BackendMeResponse>(
                  `${config.api.baseUrl}/auth/me`,
                  {
                    headers: {
                      'Authorization': `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );
                
                if (response.data.success && response.data.user) {
                  const user = transformBackendUser(response.data.user);
                  login(user, { accessToken, refreshToken, expiresAt });
                  
                  // Check for pending lawyer registration and submit it
                  const lawyerSubmitted = await submitPendingLawyerRegistration();
                  
                  if (lawyerSubmitted) {
                    toast({ 
                      title: 'Success', 
                      description: 'Signed in! Your lawyer registration has been submitted for review.', 
                      variant: 'success' 
                    });
                  } else {
                    toast({ title: 'Success', description: 'Successfully signed in!', variant: 'success' });
                  }
                  
                  router.replace('/dashboard');
                  return;
                }
              } catch (syncErr) {
                console.error('Profile sync error:', syncErr);
                throw new Error('Failed to create user profile. Please try again.');
              }
            }
          }
        }

        // If we get here without tokens, check query params (some OAuth flows use this)
        const code = searchParams.get('code');
        if (code) {
          // Code flow - this would need server-side handling
          toast({ title: 'Please wait', description: 'Completing sign in...', variant: 'info' });
          // For now, redirect to login with a message
          router.replace('/login?oauth=pending');
          return;
        }

        // No valid auth data found
        throw new Error('Authentication failed. No valid session data received.');
      } catch (err) {
        console.error('OAuth callback error:', err);
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setError(message);
        toast({ title: 'Error', description: message, variant: 'error' });
        
        // Only auto-redirect for non-expired link errors
        const isExpiredError = message.includes('expired') || message.includes('invalid');
        if (!isExpiredError) {
          // Redirect to login after a delay
          setTimeout(() => {
            router.replace('/login?error=oauth_failed');
          }, 3000);
        }
      }
    };

    handleCallback();
  }, [searchParams, router, login, toast]);

  if (error) {
    const isExpiredLink = error.includes('expired') || error.includes('invalid');
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2">
            {isExpiredLink ? 'Link Expired' : 'Authentication Failed'}
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          
          <div className="space-y-3">
            {isExpiredLink && (
              <a
                href="/register"
                className="block w-full py-2.5 px-4 rounded-lg text-white font-medium transition-colors"
                style={{ background: '#4F46E5' }}
              >
                Register Again
              </a>
            )}
            <a
              href="/login"
              className="block w-full py-2.5 px-4 rounded-lg font-medium transition-colors border"
              style={{ 
                background: isExpiredLink ? '#ffffff' : '#4F46E5', 
                color: isExpiredLink ? '#374151' : '#ffffff',
                borderColor: isExpiredLink ? '#E5E7EB' : '#4F46E5'
              }}
            >
              {isExpiredLink ? 'Back to Login' : 'Go to Login'}
            </a>
            {isExpiredLink && (
              <a
                href="/forgot-password"
                className="block w-full py-2.5 px-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot Password?
              </a>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mt-6">
            {isExpiredLink 
              ? 'Verification links expire after 24 hours for security reasons.'
              : 'Redirecting to login in a few seconds...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <Spinner size="lg" />
      <p className="mt-4 text-muted-foreground">{statusMessage}</p>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
