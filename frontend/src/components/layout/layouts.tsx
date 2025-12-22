"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { Footer } from "./footer";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";

// ============================================
// Layout Variants
// ============================================

interface BaseLayoutProps {
  children: React.ReactNode;
  className?: string;
}

// Public Layout - For marketing pages
export function PublicLayout({ children, className }: BaseLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className={cn("flex-1", className)}>{children}</main>
      <Footer />
    </div>
  );
}

// Auth Layout - For login/register pages
export function AuthLayout({ children, className }: BaseLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <main
        className={cn(
          "flex-1 flex items-center justify-center px-4 py-12",
          className
        )}
      >
        {children}
      </main>
      <Footer variant="minimal" />
    </div>
  );
}

// Dashboard Layout - For authenticated users
export function DashboardLayout({ children, className }: BaseLayoutProps) {
  const { isAuthenticated } = useAuthStore();
  const { sidebarOpen, sidebarCollapsed } = useUIStore();

  // Calculate main content margin based on sidebar state
  const sidebarWidth = sidebarCollapsed ? 80 : 256;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <div className="flex">
        {/* Sidebar - Hidden on mobile */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Main Content */}
        <motion.main
          initial={false}
          animate={{
            marginLeft: isAuthenticated && sidebarOpen ? sidebarWidth : 0,
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={cn(
            "flex-1 min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-4.5rem)]",
            "transition-[margin] duration-200",
            "pb-20 lg:pb-0", // Bottom padding for mobile nav
            className
          )}
        >
          <div className="container-wide py-6 lg:py-8">{children}</div>
        </motion.main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}

// Minimal Layout - For focused pages (checkout, onboarding)
export function MinimalLayout({ children, className }: BaseLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className={cn("flex-1 bg-neutral-50", className)}>{children}</main>
    </div>
  );
}

// Full Width Layout - For pages without sidebar
export function FullWidthLayout({ children, className }: BaseLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main
        className={cn(
          "min-h-[calc(100vh-4rem)] lg:min-h-[calc(100vh-4.5rem)]",
          "pb-20 lg:pb-0",
          className
        )}
      >
        {children}
      </main>
      <MobileNav />
    </div>
  );
}

// ============================================
// Page Container Components
// ============================================

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 lg:mb-8", className)}>
      {breadcrumbs && <div className="mb-4">{breadcrumbs}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-neutral-600">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}

interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className,
}: PageSectionProps) {
  return (
    <section className={cn("mb-8", className)}>
      {(title || description || actions) && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-neutral-500">{description}</p>
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

// ============================================
// Content Grid Components
// ============================================

interface ContentGridProps {
  children: React.ReactNode;
  className?: string;
}

export function ContentGrid({ children, className }: ContentGridProps) {
  return (
    <div
      className={cn(
        "grid gap-6",
        "grid-cols-1 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export function MainContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("lg:col-span-2 space-y-6", className)}>{children}</div>
  );
}

export function SideContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}
