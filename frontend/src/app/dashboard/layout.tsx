'use client';

import { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/auth';
import { Sidebar, MobileNav } from '@/components/layout';
import { useUIStore } from '@/stores';
import { cn } from '@/lib/utils';

// ============================================
// Dashboard Layout
// ============================================

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <ProtectedRoute allowedRoles={['user']}>
      <div className="min-h-screen bg-slate-50">
        {/* Sidebar - Desktop */}
        <Sidebar />
        
        {/* Main Content */}
        <main
          className={cn(
            'min-h-screen transition-all duration-300 pb-20 lg:pb-0',
            sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
          )}
        >
          <div className="container py-8">
            {children}
          </div>
        </main>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}
