import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Scale } from 'lucide-react';
import { GuestRoute, LoginForm } from '@/components/auth';
import { Spinner } from '@/components/ui';
import { config } from '@/config';

// ============================================
// Metadata
// ============================================

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Nyaay Saathi account to access legal services, consultations, and manage your cases.',
};

// ============================================
// Login Page
// ============================================

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <GuestRoute>
        <div className="min-h-screen flex">
          {/* Left Panel - Form */}
          <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
            <div className="mx-auto w-full max-w-sm lg:w-96">
              {/* Logo */}
              <div className="mb-8">
                <Link href="/" className="inline-flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Scale className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold">{config.app.name}</span>
                </Link>
              </div>

              {/* Header */}
              <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight">
                  Welcome back
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Sign in to continue to your account
                </p>
              </div>

              {/* Form */}
              <LoginForm />
            </div>
          </div>

          {/* Right Panel - Image/Illustration */}
          <div className="relative hidden w-0 flex-1 lg:block">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary-800">
              <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-20" />
              <div className="relative h-full flex flex-col justify-center px-16">
                <div className="max-w-lg">
                  <blockquote className="text-2xl font-medium text-white leading-relaxed">
                    &ldquo;Justice delayed is justice denied. With Nyaay Saathi, 
                    legal help is just a click away.&rdquo;
                  </blockquote>
                  <div className="mt-6">
                    <p className="text-white/80 font-medium">
                      — Trusted by 10,000+ clients across India
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="mt-12 grid grid-cols-3 gap-8">
                    <div>
                      <p className="text-3xl font-bold text-white">500+</p>
                      <p className="text-white/70 text-sm">Verified Lawyers</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">10k+</p>
                      <p className="text-white/70 text-sm">Consultations</p>
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">4.8</p>
                      <p className="text-white/70 text-sm">Average Rating</p>
                    </div>
                  </div>
                </div>
              </div>
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

function LoginPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
