'use client';

import Link from 'next/link';
import { 
  Scale, 
  Users, 
  Building2, 
  Home, 
  Briefcase, 
  Shield,
  Landmark,
  FileText,
  Globe,
  Heart,
  Car,
  CreditCard,
  ArrowRight
} from 'lucide-react';

const practiceAreas = [
  {
    id: 'criminal',
    name: 'Criminal Law',
    description: 'Defense against criminal charges, bail applications, and trial representation',
    icon: Shield,
    color: 'bg-red-500',
  },
  {
    id: 'civil',
    name: 'Civil Law',
    description: 'Civil disputes, contracts, property matters, and injunctions',
    icon: Scale,
    color: 'bg-blue-500',
  },
  {
    id: 'family',
    name: 'Family Law',
    description: 'Divorce, custody, maintenance, domestic violence, and matrimonial disputes',
    icon: Users,
    color: 'bg-pink-500',
  },
  {
    id: 'corporate',
    name: 'Corporate Law',
    description: 'Business formation, mergers, acquisitions, and corporate governance',
    icon: Building2,
    color: 'bg-indigo-500',
  },
  {
    id: 'property',
    name: 'Property Law',
    description: 'Real estate transactions, title verification, and property disputes',
    icon: Home,
    color: 'bg-green-500',
  },
  {
    id: 'labour',
    name: 'Labour Law',
    description: 'Employment disputes, workplace issues, and labor compliance',
    icon: Briefcase,
    color: 'bg-orange-500',
  },
  {
    id: 'constitutional',
    name: 'Constitutional Law',
    description: 'Fundamental rights, PIL, and constitutional remedies',
    icon: Landmark,
    color: 'bg-purple-500',
  },
  {
    id: 'tax',
    name: 'Tax Law',
    description: 'Income tax, GST, tax planning, and tax disputes',
    icon: FileText,
    color: 'bg-yellow-500',
  },
  {
    id: 'cyber',
    name: 'Cyber Law',
    description: 'Cybercrime, data protection, and digital rights',
    icon: Globe,
    color: 'bg-cyan-500',
  },
  {
    id: 'consumer',
    name: 'Consumer Law',
    description: 'Consumer complaints, product liability, and unfair trade practices',
    icon: CreditCard,
    color: 'bg-emerald-500',
  },
  {
    id: 'medical',
    name: 'Medical Law',
    description: 'Medical negligence, healthcare disputes, and patient rights',
    icon: Heart,
    color: 'bg-rose-500',
  },
  {
    id: 'motor',
    name: 'Motor Accident Claims',
    description: 'Accident compensation, insurance claims, and MACT cases',
    icon: Car,
    color: 'bg-amber-500',
  },
];

export default function PracticeAreasPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Scale className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Nyaay Saathi</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/lawyers" className="text-sm font-medium hover:text-primary transition-colors">
              Find Lawyers
            </Link>
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto text-center max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">Practice Areas</h1>
          <p className="text-lg text-muted-foreground">
            Our network of verified lawyers covers all major areas of law in India. 
            Find the right expert for your legal needs.
          </p>
        </div>
      </section>

      {/* Practice Areas Grid */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {practiceAreas.map((area) => {
              const Icon = area.icon;
              return (
                <Link
                  key={area.id}
                  href={`/lawyers?area=${encodeURIComponent(area.name)}`}
                  className="group block p-6 rounded-xl border bg-card hover:shadow-lg transition-all duration-300 hover:border-primary/50"
                >
                  <div className={`w-12 h-12 rounded-lg ${area.color} flex items-center justify-center mb-4`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {area.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {area.description}
                  </p>
                  <span className="inline-flex items-center text-sm font-medium text-primary">
                    Find Lawyers
                    <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Can&apos;t find what you&apos;re looking for?</h2>
          <p className="text-muted-foreground mb-6">
            Our legal experts cover many more specialized areas. Browse all lawyers or contact us for assistance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/lawyers"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Browse All Lawyers
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-6 py-3 rounded-lg border font-medium hover:bg-accent transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
