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
    <ProtectedRoute allowedRoles={['client']}>
      <div className="min-h-screen bg-muted/30">
        {/* Sidebar - Desktop */}
        <Sidebar variant="client" />
        
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
        <MobileNav variant="client" />
      </div>
    </ProtectedRoute>
  );
}
