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
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary-800">
              <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-20" />
              <div className="relative h-full flex flex-col justify-center px-16">
                <div className="max-w-lg">
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Your Legal Journey Starts Here
                  </h2>
                  <p className="text-white/80 text-lg mb-12">
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
                  <div className="mt-16 p-6 rounded-2xl bg-white/10 backdrop-blur">
                    <p className="text-white/90 italic">
                      &ldquo;Nyaay Saathi helped me find the right lawyer for my property dispute. 
                      The process was smooth and the consultation was very helpful.&rdquo;
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-white font-semibold">RK</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">Rahul Kumar</p>
                        <p className="text-white/60 text-sm">Verified Client</p>
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
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-white">
        {icon}
      </div>
      <div>
        <h3 className="text-white font-semibold">{title}</h3>
        <p className="text-white/70 text-sm">{description}</p>
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
