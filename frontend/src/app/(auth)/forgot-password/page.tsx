import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Scale } from 'lucide-react';
import { GuestRoute, ForgotPasswordForm } from '@/components/auth';
import { Spinner } from '@/components/ui';
import { config } from '@/config';

// ============================================
// Metadata
// ============================================

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your Nyaay Saathi account password.',
};

// ============================================
// Forgot Password Page
// ============================================

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <GuestRoute>
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-muted/30">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            {/* Logo */}
            <Link href="/" className="flex justify-center">
              <div className="inline-flex items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                  <Scale className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
            </Link>
            <h2 className="mt-6 text-center text-2xl font-bold text-foreground">
              {config.app.name}
            </h2>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-background py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border">
              <ForgotPasswordForm />
            </div>
          </div>
        </div>
      </GuestRoute>
    </Suspense>
  );
}

// ============================================
// Loading Fallback
// ============================================

function ForgotPasswordFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
