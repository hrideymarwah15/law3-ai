import { Suspense } from 'react';
import { Metadata } from 'next';
import { Header, Footer } from '@/components/layout';
import { LawyerProfilePage } from '@/components/lawyers';
import { Spinner } from '@/components/ui';

// ============================================
// Generate Metadata
// ============================================

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  // In production, fetch lawyer data here for SEO
  return {
    title: 'Lawyer Profile',
    description: 'View lawyer profile, experience, reviews, and book a consultation.',
  };
}

// ============================================
// Lawyer Profile Page
// ============================================

export default async function LawyerPage({ params }: PageProps) {
  const { id } = await params;
  
  return (
    <>
      <Header />
      <Suspense fallback={<LawyerPageFallback />}>
        <LawyerProfilePage lawyerId={id} />
      </Suspense>
      <Footer variant="minimal" />
    </>
  );
}

function LawyerPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
