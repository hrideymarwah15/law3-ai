import { Suspense } from 'react';
import { Metadata } from 'next';
import { Header, Footer } from '@/components/layout';
import { LawyersListPage } from '@/components/lawyers';
import { Spinner } from '@/components/ui';

// ============================================
// Metadata
// ============================================

export const metadata: Metadata = {
  title: 'Find a Lawyer',
  description: 'Browse and connect with verified lawyers across India. Filter by practice area, location, rating, and more.',
};

// ============================================
// Lawyers Page
// ============================================

export default function LawyersPage() {
  return (
    <>
      <Header />
      <Suspense fallback={<LawyersPageFallback />}>
        <LawyersListPage />
      </Suspense>
      <Footer variant="minimal" />
    </>
  );
}

function LawyersPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
