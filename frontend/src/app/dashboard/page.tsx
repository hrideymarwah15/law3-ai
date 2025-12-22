import { Metadata } from 'next';
import { ClientDashboard } from '@/components/dashboard';

// ============================================
// Metadata
// ============================================

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Manage your legal consultations, messages, and documents.',
};

// ============================================
// Dashboard Page
// ============================================

export default function DashboardPage() {
  return <ClientDashboard />;
}
