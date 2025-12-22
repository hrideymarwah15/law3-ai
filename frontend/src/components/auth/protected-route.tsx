'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { Spinner } from '@/components/ui';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Loading Screen Component
// ============================================

function AuthLoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-sm"
        >
          Verifying authentication...
        </motion.p>
      </motion.div>
    </div>
  );
}

// ============================================
// Protected Route HOC
// ============================================

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('client' | 'lawyer' | 'admin')[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
  fallback,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, accessToken } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for hydration
    const checkAuth = async () => {
      // Small delay to ensure store is hydrated
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      if (!isLoading) {
        setIsChecking(false);
        
        if (!isAuthenticated || !accessToken) {
          // Not authenticated, redirect to login
          const redirectUrl = `${redirectTo}?redirect=${encodeURIComponent(pathname)}`;
          router.replace(redirectUrl);
          return;
        }

        if (allowedRoles && user && !allowedRoles.includes(user.role as 'client' | 'lawyer' | 'admin')) {
          // User doesn't have required role
          router.replace('/unauthorized');
          return;
        }
      }
    };

    checkAuth();
  }, [isLoading, isAuthenticated, accessToken, user, allowedRoles, router, pathname, redirectTo]);

  // Show loading while checking auth
  if (isChecking || isLoading) {
    return fallback || <AuthLoadingScreen />;
  }

  // If not authenticated, don't render children (redirect will happen)
  if (!isAuthenticated || !accessToken) {
    return null;
  }

  // If role check fails, don't render children
  if (allowedRoles && user && !allowedRoles.includes(user.role as 'client' | 'lawyer' | 'admin')) {
    return null;
  }

  return <>{children}</>;
}

// ============================================
// Guest Route HOC (for login/register pages)
// ============================================

interface GuestRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function GuestRoute({
  children,
  redirectTo,
  fallback,
}: GuestRouteProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      if (!isLoading) {
        setIsChecking(false);
        
        if (isAuthenticated && user) {
          // User is authenticated, redirect to appropriate dashboard
          const redirect = searchParams.get('redirect');
          const defaultRedirect = getDefaultRedirect(user.role);
          router.replace(redirect || redirectTo || defaultRedirect);
        }
      }
    };

    checkAuth();
  }, [isLoading, isAuthenticated, user, router, searchParams, redirectTo]);

  // Show loading while checking auth
  if (isChecking || isLoading) {
    return fallback || <AuthLoadingScreen />;
  }

  // If authenticated, don't render children (redirect will happen)
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// ============================================
// Role-Specific Route Guards
// ============================================

interface ClientRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ClientRoute({ children, fallback }: ClientRouteProps) {
  return (
    <ProtectedRoute allowedRoles={['client']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

interface LawyerRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LawyerRoute({ children, fallback }: LawyerRouteProps) {
  return (
    <ProtectedRoute allowedRoles={['lawyer']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

interface AdminRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminRoute({ children, fallback }: AdminRouteProps) {
  return (
    <ProtectedRoute allowedRoles={['admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

// ============================================
// Higher-Order Component Pattern
// ============================================

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    allowedRoles?: ('client' | 'lawyer' | 'admin')[];
    redirectTo?: string;
  }
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute
        allowedRoles={options?.allowedRoles}
        redirectTo={options?.redirectTo}
      >
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

export function withGuest<P extends object>(
  Component: React.ComponentType<P>,
  redirectTo?: string
) {
  return function GuestComponent(props: P) {
    return (
      <GuestRoute redirectTo={redirectTo}>
        <Component {...props} />
      </GuestRoute>
    );
  };
}

// ============================================
// Helper Functions
// ============================================

function getDefaultRedirect(role: string): string {
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
// Auth Status Component (for conditional rendering)
// ============================================

interface AuthStatusProps {
  authenticated?: React.ReactNode;
  unauthenticated?: React.ReactNode;
  loading?: React.ReactNode;
}

export function AuthStatus({
  authenticated,
  unauthenticated,
  loading,
}: AuthStatusProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <>{loading}</>;
  }

  if (isAuthenticated) {
    return <>{authenticated}</>;
  }

  return <>{unauthenticated}</>;
}

// ============================================
// Role Check Component (for conditional rendering)
// ============================================

interface RoleCheckProps {
  roles: ('client' | 'lawyer' | 'admin')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleCheck({ roles, children, fallback }: RoleCheckProps) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <>{fallback}</>;
  }

  if (!roles.includes(user.role as 'client' | 'lawyer' | 'admin')) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
