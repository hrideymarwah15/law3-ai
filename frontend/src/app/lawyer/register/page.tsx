'use client';

import Link from 'next/link';
import { LawyerRegisterForm } from '@/components/auth/lawyer-register-form';
import { Scale, Shield, Users, Clock, CheckCircle, ArrowLeft } from 'lucide-react';

// Features displayed on the left panel
const features = [
  {
    icon: Users,
    title: 'Connect with Clients',
    description: 'Access thousands of clients seeking legal assistance',
  },
  {
    icon: Clock,
    title: 'Flexible Schedule',
    description: 'Set your own availability and consultation hours',
  },
  {
    icon: Shield,
    title: 'Verified Platform',
    description: 'Join a trusted network of Bar Council verified lawyers',
  },
  {
    icon: CheckCircle,
    title: 'Easy Payments',
    description: 'Secure and timely payments directly to your account',
  },
];

export default function LawyerRegisterPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding & Features */}
      <div 
        className="hidden lg:flex lg:w-1/2 xl:w-2/5 flex-col justify-between p-12"
        style={{ 
          background: 'linear-gradient(135deg, #4F46E5 0%, #2563EB 50%, #1D4ED8 100%)',
        }}
      >
        {/* Logo */}
        <div>
          <Link href="/" className="flex items-center gap-2 text-white">
            <Scale className="h-8 w-8" />
            <span className="text-2xl font-bold">Nyaay Saathi</span>
          </Link>
        </div>

        {/* Hero Content */}
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Join Our Network of Legal Experts
            </h1>
            <p className="text-lg text-white/80">
              Register as a lawyer and start providing legal consultations to clients across India.
            </p>
          </div>

          {/* Features List */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-4">
                <div 
                  className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-white/70">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div>
          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Nyaay Saathi. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gray-50">
        <div className="w-full max-w-2xl">
          {/* Back Link */}
          <Link
            href="/register"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to regular registration
          </Link>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4 lg:hidden">
              <Scale className="h-8 w-8" style={{ color: '#4F46E5' }} />
              <span className="text-2xl font-bold">Nyaay Saathi</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Register as a Lawyer
            </h1>
            <p className="text-muted-foreground mt-2">
              Complete the form below to apply for lawyer registration. Your application will be reviewed within 3-5 business days.
            </p>
          </div>

          {/* Registration Form */}
          <LawyerRegisterForm />
        </div>
      </div>
    </div>
  );
}
