'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth, loginSchema, type LoginFormData } from '@/hooks';
import { authApi } from '@/lib/api/auth';
import {
  Button,
  Input,
  Checkbox,
  Alert,
  Spinner,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/utils';

// ============================================
// Login Form Component
// ============================================

interface LoginFormProps {
  className?: string;
  onSuccess?: () => void;
}

function LoginFormInner({ className, onSuccess }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginMutation } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  
  const resetSuccess = searchParams.get('reset') === 'success';
  const verifiedSuccess = searchParams.get('verified') === 'success';
  const redirectTo = searchParams.get('redirect');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
      });
      
      onSuccess?.();
      
      // Redirect is handled by the auth hook, but we can override here
      if (redirectTo) {
        router.push(redirectTo);
      }
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Success Messages */}
      <AnimatePresence mode="wait">
        {resetSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <Alert variant="success" icon={<CheckCircle className="h-4 w-4" />}>
              Your password has been reset successfully. Please log in with your new password.
            </Alert>
          </motion.div>
        )}
        {verifiedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <Alert variant="success" icon={<CheckCircle className="h-4 w-4" />}>
              Your email has been verified. You can now log in.
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence mode="wait">
        {loginMutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6"
          >
            <Alert variant="error" icon={<AlertCircle className="h-4 w-4" />}>
              {(loginMutation.error as Error)?.message || 'Invalid email or password. Please try again.'}
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Email Input */}
        <Input
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          leftElement={<Mail className="h-4 w-4 text-muted-foreground" />}
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Password Input */}
        <div className="space-y-2">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
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
        </div>

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <Checkbox
            label="Remember me"
            {...register('rememberMe')}
          />
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isSubmitting || loginMutation.isPending}
          style={{ 
            background: isSubmitting || loginMutation.isPending ? '#9CA3AF' : '#4F46E5', 
            color: '#ffffff',
            cursor: isSubmitting || loginMutation.isPending ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting || loginMutation.isPending ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* Social Login Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button 
          variant="outline" 
          type="button" 
          className="w-full"
          style={{ background: '#ffffff', color: '#1f2937', border: '1px solid #e5e7eb' }}
          disabled={oauthLoading !== null}
          onClick={async () => {
            try {
              setOauthLoading('google');
              const redirectUrl = `${window.location.origin}/auth/callback`;
              const response = await authApi.initiateOAuth('google', redirectUrl);
              if (response.success && response.url) {
                window.location.href = response.url;
              }
            } catch (error) {
              toast({ 
                title: 'Error', 
                description: 'Failed to initiate Google sign in. Please try again.',
                variant: 'error'
              });
              setOauthLoading(null);
            }
          }}
        >
          {oauthLoading === 'google' ? (
            <Spinner size="sm" className="mr-2" />
          ) : (
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Google
        </Button>
        <Button 
          variant="outline" 
          type="button" 
          className="w-full"
          style={{ background: '#000000', color: '#ffffff', border: '1px solid #000000' }}
          disabled={oauthLoading !== null}
          onClick={() => {
            toast({ 
              title: 'Coming Soon', 
              description: 'Apple Sign In coming soon!',
              variant: 'info'
            });
          }}
        >
          <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
          </svg>
          Apple
        </Button>
      </div>

      {/* Sign Up Link */}
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}

// ============================================
// Exported Login Form with Suspense
// ============================================

export function LoginForm(props: LoginFormProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      }
    >
      <LoginFormInner {...props} />
    </Suspense>
  );
}

// ============================================
// Two Factor Auth Form (if needed)
// ============================================

interface TwoFactorFormProps {
  onSubmit: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export function TwoFactorForm({ onSubmit, onResend, isLoading, error }: TwoFactorFormProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all fields are filled
    if (newCode.every((c) => c) && value) {
      onSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    await onResend();
    setResendCooldown(60);
    
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Two-Factor Authentication</h2>
        <p className="mt-2 text-muted-foreground">
          Enter the 6-digit code sent to your phone
        </p>
      </div>

      {error && (
        <Alert variant="error">
          {error}
        </Alert>
      )}

      <div className="flex justify-center gap-2">
        {code.map((digit, index) => (
          <input
            key={index}
            id={`code-${index}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-14 text-center text-2xl font-bold rounded-lg border border-input bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            disabled={isLoading}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={handleResend}
        disabled={resendCooldown > 0 || isLoading}
      >
        {resendCooldown > 0 ? (
          `Resend code in ${resendCooldown}s`
        ) : (
          'Resend code'
        )}
      </Button>
    </div>
  );
}
