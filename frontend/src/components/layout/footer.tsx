"use client";

import * as React from "react";
import Link from "next/link";
import {
  Scale,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
} from "lucide-react";
import { config } from "@/config";

// ============================================
// Footer Links
// ============================================

const footerLinks = {
  services: [
    { label: "Find Lawyers", href: "/lawyers" },
    { label: "AI Legal Assistant", href: "/ai-assistant" },
    { label: "Video Consultation", href: "/lawyers?type=video" },
    { label: "Document Review", href: "/services/document-review" },
  ],
  practiceAreas: [
    { label: "Criminal Law", href: "/practice-areas/criminal" },
    { label: "Family Law", href: "/practice-areas/family" },
    { label: "Property Law", href: "/practice-areas/property" },
    { label: "Corporate Law", href: "/practice-areas/corporate" },
    { label: "Consumer Rights", href: "/practice-areas/consumer" },
    { label: "View All", href: "/practice-areas" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "For Lawyers", href: "/for-lawyers" },
    { label: "Careers", href: "/careers" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Disclaimer", href: "/disclaimer" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: config.social.facebook, label: "Facebook" },
  { icon: Twitter, href: config.social.twitter, label: "Twitter" },
  { icon: Linkedin, href: config.social.linkedin, label: "LinkedIn" },
  { icon: Instagram, href: config.social.instagram, label: "Instagram" },
];

// ============================================
// Footer Component
// ============================================

interface FooterProps {
  variant?: "full" | "minimal";
}

export function Footer({ variant = "full" }: FooterProps) {
  if (variant === "minimal") {
    return (
      <footer className="border-t border-neutral-200 bg-white">
        <div className="container-wide py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-neutral-500">
              © {new Date().getFullYear()} {config.app.name}. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/terms"
                className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-neutral-900 text-white">
      {/* Main Footer */}
      <div className="container-wide py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xl font-bold text-white">
                  {config.app.name}
                </span>
                <p className="text-xs text-neutral-400">न्याय सबके लिए</p>
              </div>
            </Link>
            <p className="text-sm text-neutral-400 mb-6 max-w-xs">
              {config.app.description}
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <a
                href={`mailto:${config.contact.email}`}
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4" />
                {config.contact.email}
              </a>
              <a
                href={`tel:${config.contact.phone}`}
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                <Phone className="h-4 w-4" />
                {config.contact.phone}
              </a>
              <p className="flex items-center gap-2 text-sm text-neutral-400">
                <MapPin className="h-4 w-4" />
                {config.contact.address}
              </p>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Services</h3>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Practice Areas */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">
              Practice Areas
            </h3>
            <ul className="space-y-3">
              {footerLinks.practiceAreas.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-neutral-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-neutral-800">
        <div className="container-wide py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-neutral-500">
              © {new Date().getFullYear()} {config.app.name}. All rights reserved.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
