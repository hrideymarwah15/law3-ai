"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Users,
  FileText,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Star,
  Clock,
  BarChart3,
  UserCog,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, SimpleTooltip, CountBadge } from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useChatStore } from "@/stores/chat-store";

// ============================================
// Sidebar Navigation Items
// ============================================

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const userNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/consultations", label: "Consultations", icon: Calendar },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/lawyers", label: "Find Lawyers", icon: Users },
  { href: "/documents", label: "Documents", icon: FileText },
];

const lawyerNavItems: NavItem[] = [
  { href: "/lawyer/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lawyer/consultations", label: "Consultations", icon: Calendar },
  { href: "/lawyer/schedule", label: "Schedule", icon: Clock },
  { href: "/lawyer/messages", label: "Messages", icon: MessageSquare },
  { href: "/lawyer/earnings", label: "Earnings", icon: Wallet },
  { href: "/lawyer/reviews", label: "Reviews", icon: Star },
  { href: "/lawyer/analytics", label: "Analytics", icon: BarChart3 },
];

const adminNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/lawyers", label: "Lawyers", icon: UserCog },
  { href: "/admin/consultations", label: "Consultations", icon: Calendar },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Shield },
];

const bottomNavItems: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
];

// ============================================
// Sidebar Component
// ============================================

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sidebarOpen, sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const { totalUnread } = useChatStore();

  // Get nav items based on user role
  const navItems = React.useMemo(() => {
    switch (user?.role) {
      case "admin":
        return adminNavItems;
      case "lawyer":
        return lawyerNavItems;
      default:
        return userNavItems;
    }
  }, [user?.role]);

  // Add message badge
  const navItemsWithBadges = React.useMemo(() => {
    return navItems.map((item) => {
      if (item.href.includes("messages") && totalUnread > 0) {
        return { ...item, badge: totalUnread };
      }
      return item;
    });
  }, [navItems, totalUnread]);

  if (!sidebarOpen) return null;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 80 : 256 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className={cn(
        "fixed left-0 top-16 bottom-0 z-30",
        "flex flex-col",
        "bg-white border-r border-neutral-200",
        "lg:top-[72px]"
      )}
    >
      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItemsWithBadges.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  "group relative",
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive
                      ? "text-primary-600"
                      : "text-neutral-400 group-hover:text-neutral-600"
                  )}
                />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {item.badge && item.badge > 0 && (
                  <CountBadge
                    count={item.badge}
                    className={cn(
                      "ml-auto",
                      sidebarCollapsed && "absolute -top-1 -right-1"
                    )}
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-600 rounded-r-full"
                  />
                )}
              </Link>
            );

            if (sidebarCollapsed) {
              return (
                <li key={item.href}>
                  <SimpleTooltip content={item.label} side="right">
                    {linkContent}
                  </SimpleTooltip>
                </li>
              );
            }

            return <li key={item.href}>{linkContent}</li>;
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-neutral-200 p-3">
        <ul className="space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            const linkContent = (
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive ? "text-primary-600" : "text-neutral-400"
                  )}
                />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );

            if (sidebarCollapsed) {
              return (
                <li key={item.href}>
                  <SimpleTooltip content={item.label} side="right">
                    {linkContent}
                  </SimpleTooltip>
                </li>
              );
            }

            return <li key={item.href}>{linkContent}</li>;
          })}
        </ul>

        {/* Collapse Toggle */}
        <div className="mt-3 pt-3 border-t border-neutral-100">
          <SimpleTooltip
            content={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            side="right"
          >
            <Button
              variant="ghost"
              size={sidebarCollapsed ? "icon" : "sm"}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                "w-full",
                !sidebarCollapsed && "justify-start"
              )}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </SimpleTooltip>
        </div>
      </div>
    </motion.aside>
  );
}
