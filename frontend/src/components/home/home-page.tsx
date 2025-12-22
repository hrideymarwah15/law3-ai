'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Scale, 
  Search, 
  Video, 
  FileText, 
  Shield, 
  Clock, 
  Star,
  ArrowRight,
  CheckCircle,
  Users,
  Gavel,
  Building,
  Heart,
  Car,
  Briefcase,
  Home as HomeIcon,
  ChevronRight
} from 'lucide-react';
import { Button, Card, Badge, Avatar, AvatarGroup } from '@/components/ui';
import { cn } from '@/lib/utils';
import { config } from '@/config';

// ============================================
// Animation Variants
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

// ============================================
// Hero Section
// ============================================

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background pt-20 pb-32">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/patterns/grid.svg')] opacity-5" />
      
      <div className="container relative">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="mx-auto max-w-4xl text-center"
        >
          {/* Badge */}
          <motion.div variants={fadeInUp}>
            <Badge variant="secondary" className="mb-6 px-4 py-2">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Trusted by 10,000+ clients across India
              </span>
            </Badge>
          </motion.div>

          {/* Heading */}
          <motion.h1
            variants={fadeInUp}
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Legal Help Made{' '}
            <span className="text-primary">Simple</span>
            <br />
            <span className="text-muted-foreground">& Accessible</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            variants={fadeInUp}
            className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Connect with verified lawyers across India for expert legal advice. 
            Video consultations, document review, and ongoing legal support — all in one place.
          </motion.p>

          {/* Search Bar */}
          <motion.div variants={fadeInUp} className="mt-10 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search for lawyers or legal services..."
                  className="w-full h-14 pl-12 pr-4 rounded-xl border border-input bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-base"
                />
              </div>
              <Button 
                size="lg" 
                className="h-14 px-8"
                style={{ background: '#4F46E5', color: '#ffffff' }}
              >
                Find a Lawyer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {/* Popular Searches */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="text-sm text-muted-foreground">Popular:</span>
              {['Property Dispute', 'Divorce', 'Criminal Defense', 'Corporate Law'].map((term) => (
                <Link
                  key={term}
                  href={`/lawyers?area=${encodeURIComponent(term)}`}
                  className="text-sm text-primary hover:underline"
                >
                  {term}
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={fadeInUp}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            <StatItem number="500+" label="Verified Lawyers" />
            <StatItem number="10k+" label="Consultations Done" />
            <StatItem number="4.8" label="Average Rating" />
            <StatItem number="24/7" label="Support Available" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function StatItem({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-bold text-foreground">{number}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ============================================
// Practice Areas Section
// ============================================

const practiceAreas = [
  { icon: Gavel, name: 'Criminal Law', count: 120, color: 'bg-red-500/10 text-red-600' },
  { icon: Building, name: 'Corporate Law', count: 85, color: 'bg-blue-500/10 text-blue-600' },
  { icon: Heart, name: 'Family Law', count: 95, color: 'bg-pink-500/10 text-pink-600' },
  { icon: HomeIcon, name: 'Property Law', count: 110, color: 'bg-green-500/10 text-green-600' },
  { icon: Car, name: 'Motor Accident', count: 65, color: 'bg-orange-500/10 text-orange-600' },
  { icon: Briefcase, name: 'Employment Law', count: 70, color: 'bg-purple-500/10 text-purple-600' },
];

function PracticeAreasSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Practice Areas</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find expert lawyers across various legal domains. Our verified professionals 
              are ready to help with your specific legal needs.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {practiceAreas.map((area) => (
              <motion.div key={area.name} variants={fadeInUp}>
                <Link href={`/lawyers?area=${encodeURIComponent(area.name)}`}>
                  <Card className="p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
                    <div className={cn('w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center', area.color)}>
                      <area.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                      {area.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{area.count} lawyers</p>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={fadeInUp} className="text-center mt-8">
            <Button variant="outline" asChild>
              <Link href="/practice-areas" style={{ background: '#ffffff', color: '#4F46E5', border: '2px solid #4F46E5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontWeight: 600, padding: '0 1rem', height: '2.75rem', borderRadius: '0.5rem' }}>
                View All Practice Areas
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// How It Works Section
// ============================================

const steps = [
  {
    step: 1,
    title: 'Search & Compare',
    description: 'Browse verified lawyers by practice area, location, and ratings. Compare profiles and consultations fees.',
    icon: Search,
  },
  {
    step: 2,
    title: 'Book Consultation',
    description: 'Schedule a video, audio, or chat consultation at your convenience. Flexible timing options available.',
    icon: Video,
  },
  {
    step: 3,
    title: 'Get Legal Advice',
    description: 'Connect with your lawyer securely. Discuss your case and get expert legal guidance.',
    icon: FileText,
  },
];

function HowItWorksSection() {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl font-bold mb-4">Three Simple Steps</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Getting legal help has never been easier. Our streamlined process 
              connects you with the right lawyer in minutes.
            </p>
          </motion.div>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-y-1/2" />

            <motion.div
              variants={staggerContainer}
              className="grid md:grid-cols-3 gap-8"
            >
              {steps.map((item) => (
                <motion.div key={item.step} variants={fadeInUp}>
                  <Card className="relative p-8 text-center bg-background">
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {item.step}
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto mb-6 flex items-center justify-center">
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div variants={fadeInUp} className="text-center mt-12">
            <Button size="lg" asChild>
              <Link href="/lawyers" style={{ background: '#4F46E5', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, padding: '0 1.5rem', height: '3rem', borderRadius: '0.5rem' }}>
                Get Started Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// Featured Lawyers Section
// ============================================

const featuredLawyers = [
  {
    id: '1',
    name: 'Adv. Priya Sharma',
    photo: null,
    initials: 'PS',
    specialization: 'Criminal Law',
    experience: 15,
    rating: 4.9,
    reviews: 128,
    consultationFee: 1500,
    languages: ['Hindi', 'English'],
    location: 'Delhi High Court',
  },
  {
    id: '2',
    name: 'Adv. Rajesh Kumar',
    photo: null,
    initials: 'RK',
    specialization: 'Corporate Law',
    experience: 20,
    rating: 4.8,
    reviews: 95,
    consultationFee: 2000,
    languages: ['Hindi', 'English', 'Punjabi'],
    location: 'Supreme Court of India',
  },
  {
    id: '3',
    name: 'Adv. Meera Patel',
    photo: null,
    initials: 'MP',
    specialization: 'Family Law',
    experience: 12,
    rating: 4.9,
    reviews: 156,
    consultationFee: 1200,
    languages: ['Hindi', 'English', 'Gujarati'],
    location: 'Bombay High Court',
  },
];

function FeaturedLawyersSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="flex justify-between items-end mb-12">
            <div>
              <Badge variant="secondary" className="mb-4">Top Rated</Badge>
              <h2 className="text-3xl font-bold mb-2">Featured Lawyers</h2>
              <p className="text-muted-foreground">
                Highly rated legal professionals trusted by thousands
              </p>
            </div>
            <Button variant="outline" asChild className="hidden md:flex">
              <Link href="/lawyers" style={{ background: '#ffffff', color: '#4F46E5', border: '2px solid #4F46E5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontWeight: 600, padding: '0 1rem', height: '2.75rem', borderRadius: '0.5rem' }}>
                View All Lawyers
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {featuredLawyers.map((lawyer) => (
              <motion.div key={lawyer.id} variants={fadeInUp}>
                <Link href={`/lawyers/${lawyer.id}`}>
                  <Card className="p-6 hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                    <div className="flex gap-4">
                      <Avatar size="lg" fallback={lawyer.initials} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{lawyer.name}</h3>
                        <p className="text-sm text-muted-foreground">{lawyer.specialization}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{lawyer.rating}</span>
                          <span className="text-muted-foreground text-sm">({lawyer.reviews})</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">{lawyer.experience} years exp.</p>
                        <p className="text-sm text-muted-foreground">{lawyer.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">₹{lawyer.consultationFee}</p>
                        <p className="text-xs text-muted-foreground">per consultation</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={fadeInUp} className="text-center mt-8 md:hidden">
            <Button variant="outline" asChild>
              <Link href="/lawyers" style={{ background: '#ffffff', color: '#4F46E5', border: '2px solid #4F46E5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontWeight: 600, padding: '0 1rem', height: '2.75rem', borderRadius: '0.5rem' }}>
                View All Lawyers
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// Testimonials Section
// ============================================

const testimonials = [
  {
    id: 1,
    content: 'Nyaay Saathi helped me find the perfect lawyer for my property dispute. The video consultation was seamless and the advice was invaluable.',
    author: 'Rahul Verma',
    role: 'Business Owner',
    rating: 5,
  },
  {
    id: 2,
    content: 'As a first-time user, I was impressed by how easy it was to navigate and book a consultation. Got expert legal advice within 24 hours!',
    author: 'Priya Singh',
    role: 'IT Professional',
    rating: 5,
  },
  {
    id: 3,
    content: 'The platform gave me access to top lawyers across India. Resolved my corporate legal matter efficiently and professionally.',
    author: 'Amit Patel',
    role: 'Startup Founder',
    rating: 5,
  },
];

function TestimonialsSection() {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl font-bold mb-4">What Our Clients Say</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Thousands of satisfied clients have found legal solutions through our platform
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {testimonials.map((testimonial) => (
              <motion.div key={testimonial.id} variants={fadeInUp}>
                <Card className="p-6 h-full flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    ))}
                  </div>
                  <p className="text-muted-foreground flex-1 mb-6">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar fallback={testimonial.author.split(' ').map(n => n[0]).join('')} />
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// Why Choose Us Section
// ============================================

const features = [
  {
    icon: Shield,
    title: 'Verified Lawyers',
    description: 'All lawyers are verified through Bar Council registration',
  },
  {
    icon: Clock,
    title: 'Quick Response',
    description: 'Get connected with a lawyer within 24 hours',
  },
  {
    icon: Star,
    title: 'Top Rated',
    description: 'Access to the best-rated legal professionals',
  },
  {
    icon: Users,
    title: 'Multi-Language',
    description: 'Lawyers available in 10+ regional languages',
  },
];

function WhyChooseUsSection() {
  return (
    <section className="py-24 bg-primary text-primary-foreground">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Nyaay Saathi?</h2>
            <p className="text-primary-foreground/80 max-w-2xl mx-auto">
              We&apos;re committed to making legal services accessible, affordable, and reliable for everyone.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={fadeInUp} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/10 mx-auto mb-4 flex items-center justify-center">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-primary-foreground/70">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// CTA Section
// ============================================

function CTASection() {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <Card className="p-12 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">
                Ready to Get Legal Help?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join thousands of satisfied clients who found the right legal solution through Nyaay Saathi.
                Start your consultation today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/lawyers" style={{ background: '#4F46E5', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, padding: '0 1.5rem', height: '3rem', borderRadius: '0.5rem' }}>
                    Find a Lawyer
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/lawyer/register" style={{ background: '#ffffff', color: '#4F46E5', border: '2px solid #4F46E5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 600, padding: '0 1.5rem', height: '3rem', borderRadius: '0.5rem' }}>
                    Register as Lawyer
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// Main Home Page Component
// ============================================

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <PracticeAreasSection />
      <HowItWorksSection />
      <FeaturedLawyersSection />
      <TestimonialsSection />
      <WhyChooseUsSection />
      <CTASection />
    </main>
  );
}
