import { Metadata } from 'next';
import { LawyerDashboard } from '@/components/dashboard';

// ============================================
// Metadata
// ============================================

export const metadata: Metadata = {
  title: 'Lawyer Dashboard',
  description: 'Manage your consultations, clients, and earnings.',
};

// ============================================
// Lawyer Dashboard Page
// ============================================

export default function LawyerDashboardPage() {
  return <LawyerDashboard />;
}
