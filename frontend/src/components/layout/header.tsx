"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Scale,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, Avatar, CountBadge } from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { useNotificationStore } from "@/stores/notification-store";
import { config } from "@/config";

// ============================================
// Navigation Links
// ============================================

const publicNavLinks = [
  { href: "/", label: "Home" },
  { href: "/lawyers", label: "Find Lawyers" },
  { href: "/practice-areas", label: "Practice Areas" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About Us" },
];

const userNavLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/consultations", label: "My Consultations" },
  { href: "/messages", label: "Messages" },
];

const lawyerNavLinks = [
  { href: "/lawyer/dashboard", label: "Dashboard" },
  { href: "/lawyer/consultations", label: "Consultations" },
  { href: "/lawyer/schedule", label: "Schedule" },
  { href: "/lawyer/earnings", label: "Earnings" },
];

// ============================================
// Header Component
// ============================================

export function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { mobileMenuOpen, setMobileMenuOpen, setNotificationsPanelOpen } = useUIStore();
  const { unreadCount } = useNotificationStore();

  const navLinks = React.useMemo(() => {
    if (!isAuthenticated) return publicNavLinks;
    if (user?.role === "lawyer") return lawyerNavLinks;
    return userNavLinks;
  }, [isAuthenticated, user?.role]);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-lg">
      <div className="container-wide">
        <div className="flex h-16 items-center justify-between gap-4 lg:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Scale className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold text-slate-900">
                {config.app.name}
              </span>
              <span className="ml-1 text-xs text-slate-500 hidden md:inline">
                न्याय सबके लिए
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "text-primary-600 bg-primary-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Search Button */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>

            {isAuthenticated ? (
              <>
                {/* Messages */}
                <Link href="/messages">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label="Messages"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </Link>

                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label="Notifications"
                  onClick={() => setNotificationsPanelOpen(true)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <CountBadge
                      count={unreadCount}
                      className="absolute -top-1 -right-1"
                    />
                  )}
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-colors">
                      <Avatar
                        src={user?.avatar}
                        alt={user?.fullName}
                        fallback={user?.fullName}
                        size="sm"
                      />
                      <ChevronDown className="h-4 w-4 text-slate-500 hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-semibold">{user?.fullName}</span>
                        <span className="text-xs text-slate-500 font-normal">
                          {user?.email}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer text-error-600"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/register">
                  <Button style={{ background: '#4F46E5', color: '#ffffff' }}>Get Started</Button>
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-slate-200 bg-white overflow-hidden"
          >
            <nav className="container-wide py-4 space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "block px-4 py-3 text-base font-medium rounded-lg transition-colors",
                      isActive
                        ? "text-primary-600 bg-primary-50"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
              {!isAuthenticated && (
                <div className="pt-4 space-y-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block"
                  >
                    <Button variant="outline" fullWidth style={{ background: '#ffffff', color: '#4F46E5', border: '2px solid #4F46E5' }}>
                      Login
                    </Button>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block"
                  >
                    <Button fullWidth style={{ background: '#4F46E5', color: '#ffffff' }}>Get Started</Button>
                  </Link>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
