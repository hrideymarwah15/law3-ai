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
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #6366F1 100%)'
              }}
            >
              {/* Decorative pattern overlay */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
              />
              {/* Decorative circles */}
              <div className="absolute top-20 right-20 w-64 h-64 rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="absolute bottom-20 left-20 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(139,92,246,0.3)' }} />
              
              <div className="relative h-full flex flex-col justify-center px-12 xl:px-16">
                <div className="max-w-lg">
                  {/* Quote Icon */}
                  <div className="mb-6">
                    <svg className="w-12 h-12" fill="rgba(255,255,255,0.4)" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                  </div>
                  
                  <blockquote className="text-2xl xl:text-3xl font-semibold leading-relaxed" style={{ color: '#ffffff' }}>
                    Justice delayed is justice denied. With Nyaay Saathi, 
                    legal help is just a click away.
                  </blockquote>
                  
                  <div className="mt-8 flex items-center gap-3">
                    <div className="w-12 h-0.5" style={{ background: 'rgba(255,255,255,0.5)' }} />
                    <p className="font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      Trusted by 10,000+ clients across India
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="mt-16 grid grid-cols-3 gap-6">
                    <div className="rounded-2xl p-5 text-center backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <p className="text-3xl xl:text-4xl font-bold" style={{ color: '#ffffff' }}>500+</p>
                      <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>Verified Lawyers</p>
                    </div>
                    <div className="rounded-2xl p-5 text-center backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <p className="text-3xl xl:text-4xl font-bold" style={{ color: '#ffffff' }}>10k+</p>
                      <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>Consultations</p>
                    </div>
                    <div className="rounded-2xl p-5 text-center backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.15)' }}>
                      <p className="text-3xl xl:text-4xl font-bold" style={{ color: '#ffffff' }}>4.8</p>
                      <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>Average Rating</p>
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
