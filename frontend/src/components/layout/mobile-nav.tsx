"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Calendar,
  MessageSquare,
  User,
  LayoutDashboard,
  Clock,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { CountBadge } from "@/components/ui";

// ============================================
// Mobile Navigation Items
// ============================================

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

const publicNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/lawyers", label: "Lawyers", icon: Search },
  { href: "/login", label: "Login", icon: User },
];

const userNavItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/lawyers", label: "Search", icon: Search },
  { href: "/consultations", label: "Bookings", icon: Calendar },
  { href: "/messages", label: "Chat", icon: MessageSquare },
  { href: "/profile", label: "Profile", icon: User },
];

const lawyerNavItems: NavItem[] = [
  { href: "/lawyer/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/lawyer/consultations", label: "Bookings", icon: Calendar },
  { href: "/lawyer/schedule", label: "Schedule", icon: Clock },
  { href: "/lawyer/messages", label: "Chat", icon: MessageSquare },
  { href: "/lawyer/earnings", label: "Earnings", icon: Wallet },
];

// ============================================
// Mobile Navigation Component
// ============================================

export function MobileNav() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const { totalUnread } = useChatStore();

  // Get nav items based on auth state and role
  const navItems = React.useMemo(() => {
    if (!isAuthenticated) return publicNavItems;
    if (user?.role === "lawyer") return lawyerNavItems;
    return userNavItems;
  }, [isAuthenticated, user?.role]);

  // Add message badge
  const navItemsWithBadges = React.useMemo(() => {
    return navItems.map((item) => {
      if (item.href.includes("messages") && totalUnread > 0) {
        return { ...item, badge: totalUnread };
      }
      return item;
    });
  }, [navItems, totalUnread]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItemsWithBadges.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center",
                "min-w-[64px] py-2 px-3 rounded-xl",
                "transition-colors duration-200",
                isActive
                  ? "text-primary-600"
                  : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-6 w-6",
                    isActive && "stroke-[2.5px]"
                  )}
                />
                {item.badge && item.badge > 0 && (
                  <CountBadge
                    count={item.badge}
                    className="absolute -top-2 -right-2"
                  />
                )}
              </div>
              <span
                className={cn(
                  "mt-1 text-[10px] font-medium",
                  isActive && "font-semibold"
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary-600 rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
