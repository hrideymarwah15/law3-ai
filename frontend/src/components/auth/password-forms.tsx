'use client';

import { useState, Suspense } from 'react';
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
  const token = searchParams.get('token');
  const { resetPasswordMutation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  // Handle invalid/missing token
  if (!token) {
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
            This password reset link is invalid or has expired.
          </p>
          <Button asChild className="w-full">
            <Link href="/forgot-password">
              Request New Link
            </Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await resetPasswordMutation.mutateAsync({
        token,
        password: data.password,
      });
      // Redirect is handled by the auth hook
    } catch (error) {
      // Error is handled by mutation
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
        {resetPasswordMutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
              {(resetPasswordMutation.error as Error)?.message || 'Failed to reset password. The link may have expired.'}
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
          disabled={isSubmitting || resetPasswordMutation.isPending}
        >
          {isSubmitting || resetPasswordMutation.isPending ? (
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
