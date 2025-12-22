import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { Scale, Shield, Clock, Star } from 'lucide-react';
import { GuestRoute, RegisterForm } from '@/components/auth';
import { Spinner } from '@/components/ui';
import { config } from '@/config';

// ============================================
// Metadata
// ============================================

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create your Nyaay Saathi account to connect with expert lawyers and get legal assistance.',
};

// ============================================
// Register Page
// ============================================

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageFallback />}>
      <GuestRoute>
        <div className="min-h-screen flex">
          {/* Left Panel - Image/Features */}
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
              {/* Decorative elements */}
              <div className="absolute top-20 left-20 w-64 h-64 rounded-full blur-3xl" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="absolute bottom-32 right-16 w-80 h-80 rounded-full blur-3xl" style={{ background: 'rgba(139,92,246,0.3)' }} />
              
              <div className="relative h-full flex flex-col justify-center px-12 xl:px-16">
                <div className="max-w-lg">
                  <h2 className="text-3xl xl:text-4xl font-bold mb-4" style={{ color: '#ffffff' }}>
                    Your Legal Journey Starts Here
                  </h2>
                  <p className="text-lg mb-12" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Join thousands of users who trust Nyaay Saathi for their legal needs.
                  </p>

                  {/* Features */}
                  <div className="space-y-6">
                    <FeatureItem
                      icon={<Shield className="h-5 w-5" />}
                      title="Verified Lawyers"
                      description="All lawyers are verified by Bar Council"
                    />
                    <FeatureItem
                      icon={<Clock className="h-5 w-5" />}
                      title="Quick Consultations"
                      description="Get legal advice within 24 hours"
                    />
                    <FeatureItem
                      icon={<Star className="h-5 w-5" />}
                      title="Secure & Confidential"
                      description="Your data is protected with end-to-end encryption"
                    />
                  </div>

                  {/* Testimonial */}
                  <div className="mt-16 p-6 rounded-2xl backdrop-blur-sm" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <p className="italic" style={{ color: 'rgba(255,255,255,0.95)' }}>
                      &ldquo;Nyaay Saathi helped me find the right lawyer for my property dispute. 
                      The process was smooth and the consultation was very helpful.&rdquo;
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                        <span className="font-semibold" style={{ color: '#ffffff' }}>RK</span>
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: '#ffffff' }}>Rahul Kumar</p>
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Verified Client</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="flex-1 flex flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 overflow-y-auto">
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
                  Create your account
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Start your journey to accessible legal services
                </p>
              </div>

              {/* Form */}
              <RegisterForm />
            </div>
          </div>
        </div>
      </GuestRoute>
    </Suspense>
  );
}

// ============================================
// Feature Item Component
// ============================================

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex gap-4">
      <div 
        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-semibold" style={{ color: '#ffffff' }}>{title}</h3>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{description}</p>
      </div>
    </div>
  );
}

// ============================================
// Loading Fallback
// ============================================

function RegisterPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
