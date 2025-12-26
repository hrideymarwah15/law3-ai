'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth, forgotPasswordSchema, resetPasswordSchema, type ForgotPasswordFormData, type ResetPasswordFormData } from '@/hooks';
import {
  Button,
  Input,
  Alert,
  Spinner,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import { createClient } from '@supabase/supabase-js';
import { config } from '@/config';

// ============================================
// Forgot Password Form
// ============================================

interface ForgotPasswordFormProps {
  className?: string;
}

export function ForgotPasswordForm({ className }: ForgotPasswordFormProps) {
  const { forgotPasswordMutation } = useAuth();
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPasswordMutation.mutateAsync(data.email);
      setSentEmail(data.email);
      setEmailSent(true);
    } catch (error) {
      // Error is handled by mutation
    }
  };

  if (emailSent) {
    return (
      <div className={cn('w-full', className)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-6">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Check your email</h2>
          <p className="text-muted-foreground mb-6">
            We&apos;ve sent a password reset link to{' '}
            <span className="font-medium text-foreground">{sentEmail}</span>
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button
              type="button"
              onClick={() => setEmailSent(false)}
              className="text-primary hover:underline font-medium"
            >
              try another email address
            </button>
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Forgot your password?</h2>
        <p className="text-muted-foreground">
          No worries, we&apos;ll send you reset instructions.
        </p>
      </div>

      {/* Error Message */}
      <AnimatePresence mode="wait">
        {forgotPasswordMutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
              {(forgotPasswordMutation.error as Error)?.message || 'Failed to send reset email. Please try again.'}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          leftElement={<Mail className="h-4 w-4 text-muted-foreground" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting || forgotPasswordMutation.isPending}
        >
          {isSubmitting || forgotPasswordMutation.isPending ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Sending...
            </>
          ) : (
            <>
              Reset Password
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}

// ============================================
// Reset Password Form
// ============================================

interface ResetPasswordFormProps {
  className?: string;
}

function ResetPasswordFormInner({ className }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Check for valid recovery session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsCheckingSession(true);
        
        // Create a Supabase client
        const supabase = createClient(
          config.supabase.url,
          config.supabase.anonKey
        );

        // First check URL hash for tokens (Supabase puts them there)
        const hash = window.location.hash;
        console.log('Reset password - URL hash:', hash); // Debug
        console.log('Reset password - Full URL:', window.location.href); // Debug
        
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const type = params.get('type');
          
          console.log('Reset password - Type:', type, 'Has tokens:', !!accessToken); // Debug
          
          // Check for errors in hash
          const errorCode = params.get('error_code');
          const errorDescription = params.get('error_description');
          
          if (errorCode) {
            let errorMessage = errorDescription?.replace(/\+/g, ' ') || 'Invalid reset link';
            if (errorCode === 'otp_expired') {
              errorMessage = 'This password reset link has expired. Please request a new one.';
            }
            console.log('Reset password - Error:', errorCode, errorMessage); // Debug
            setSessionError(errorMessage);
            setIsValidSession(false);
            setIsCheckingSession(false);
            return;
          }
          
          if (accessToken && refreshToken && type === 'recovery') {
            // Set the session from the recovery tokens
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (error) {
              console.error('Failed to set recovery session:', error);
              setSessionError('This password reset link is invalid or has expired.');
              setIsValidSession(false);
            } else {
              // Clear the hash from URL for cleaner look
              window.history.replaceState(null, '', window.location.pathname);
              setIsValidSession(true);
            }
            setIsCheckingSession(false);
            return;
          }
        }

        // Check if there's already a valid session (user might have refreshed)
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Reset password - Existing session:', !!session, error); // Debug
        
        if (error) {
          console.error('Session check error:', error);
          setSessionError('Failed to verify your session. Please request a new reset link.');
          setIsValidSession(false);
        } else if (session) {
          // Valid session exists
          setIsValidSession(true);
        } else {
          // No session and no hash tokens - invalid access
          setSessionError('No valid password reset session found. Please request a new reset link.');
          setIsValidSession(false);
        }
        
        setIsCheckingSession(false);
      } catch (err) {
        console.error('Session check failed:', err);
        setSessionError('An error occurred. Please try requesting a new reset link.');
        setIsValidSession(false);
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex flex-col items-center justify-center py-8">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Handle invalid/expired session
  if (!isValidSession) {
    return (
      <div className={cn('w-full', className)}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Invalid Reset Link</h2>
          <p className="text-muted-foreground mb-6">
            {sessionError || 'This password reset link is invalid or has expired.'}
          </p>
          <Button asChild className="w-full" style={{ background: '#4F46E5', color: '#fff' }}>
            <Link href="/forgot-password">
              Request New Link
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Password reset links expire after 1 hour for security.
          </p>
        </motion.div>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setSubmitError(null);
      
      // Use Supabase directly to update password since we have an active session
      const supabase = createClient(
        config.supabase.url,
        config.supabase.anonKey
      );

      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw error;
      }

      // Sign out to clear the recovery session
      await supabase.auth.signOut();
      
      // Redirect to login with success message
      router.replace('/login?reset=success');
    } catch (error) {
      console.error('Password reset error:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to reset password. Please try again.');
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Set new password</h2>
        <p className="text-muted-foreground">
          Your new password must be different from previously used passwords.
        </p>
      </div>

      {/* Error Message */}
      <AnimatePresence mode="wait">
        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
              {submitError}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="new-password"
          leftElement={<Lock className="h-4 w-4 text-muted-foreground" />}
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirm New Password"
          type={showConfirmPassword ? 'text' : 'password'}
          placeholder="••••••••"
          autoComplete="new-password"
          leftElement={<Lock className="h-4 w-4 text-muted-foreground" />}
          rightElement={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          }
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Resetting...
            </>
          ) : (
            <>
              Reset Password
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}

// ============================================
// Exported Reset Password Form with Suspense
// ============================================

export function ResetPasswordForm(props: ResetPasswordFormProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      }
    >
      <ResetPasswordFormInner {...props} />
    </Suspense>
  );
}
