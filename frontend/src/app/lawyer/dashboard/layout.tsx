'use client';

import { ReactNode } from 'react';
import { ProtectedRoute } from '@/components/auth';
import { Sidebar, MobileNav } from '@/components/layout';
import { useUIStore } from '@/stores';
import { cn } from '@/lib/utils';

// ============================================
// Lawyer Dashboard Layout
// ============================================

interface LawyerLayoutProps {
  children: ReactNode;
}

export default function LawyerLayout({ children }: LawyerLayoutProps) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <ProtectedRoute allowedRoles={['lawyer']}>
      <div className="min-h-screen bg-muted/30">
        {/* Sidebar - Desktop */}
        <Sidebar variant="lawyer" />
        
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
        <MobileNav variant="lawyer" />
      </div>
    </ProtectedRoute>
  );
}
