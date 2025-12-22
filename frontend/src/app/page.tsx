import { Metadata } from 'next';
import { Header, Footer } from '@/components/layout';
import HomePage from '@/components/home/home-page';
import { config } from '@/config';

// ============================================
// Metadata
// ============================================

export const metadata: Metadata = {
  title: `${config.app.name} - Legal Services Made Simple`,
  description: config.seo.defaultDescription,
};

// ============================================
// Root Page
// ============================================

export default function RootPage() {
  return (
    <>
      <Header />
      <HomePage />
      <Footer />
    </>
  );
}
