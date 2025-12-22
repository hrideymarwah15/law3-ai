'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  MessageSquare,
  FileText,
  Clock,
  ChevronRight,
  Video,
  Star,
  AlertCircle,
  CheckCircle,
  Users,
  TrendingUp,
} from 'lucide-react';
import {
  Card,
  StatCard,
  Badge,
  Button,
  Avatar,
  Skeleton,
  Separator,
} from '@/components/ui';
import { useAuthStore } from '@/stores';
import { consultationsApi, queryKeys } from '@/lib/api';
import { cn, formatDate, formatTime } from '@/lib/utils';
import type { Consultation } from '@/types';

// ============================================
// Animation Variants
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

// ============================================
// Consultation Card
// ============================================

interface ConsultationCardProps {
  consultation: Consultation;
}

function ConsultationCard({ consultation }: ConsultationCardProps) {
  const statusColors = {
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    confirmed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    in_progress: 'bg-green-500/10 text-green-600 border-green-500/20',
    completed: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  const lawyerName = consultation.lawyer 
    ? `Adv. ${consultation.lawyer.firstName} ${consultation.lawyer.lastName}`
    : 'Unknown Lawyer';
  
  const lawyerInitials = consultation.lawyer
    ? `${consultation.lawyer.firstName?.[0] || ''}${consultation.lawyer.lastName?.[0] || ''}`.toUpperCase()
    : 'UN';

  return (
    <Link href={`/dashboard/consultations/${consultation.id}`}>
      <Card className="p-4 hover:shadow-md transition-all hover:border-primary/50">
        <div className="flex gap-4">
          <Avatar
            size="lg"
            fallback={lawyerInitials}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium truncate">{lawyerName}</h4>
                <p className="text-sm text-muted-foreground truncate">
                  {consultation.practiceArea}
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn('capitalize shrink-0', statusColors[consultation.status])}
              >
                {consultation.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(consultation.scheduledAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(consultation.scheduledAt)}
              </span>
              <span className="flex items-center gap-1 capitalize">
                {consultation.type === 'video' && <Video className="h-4 w-4" />}
                {consultation.type === 'chat' && <MessageSquare className="h-4 w-4" />}
                {consultation.type}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ============================================
// Quick Actions
// ============================================

const quickActions = [
  {
    title: 'Find a Lawyer',
    description: 'Browse verified lawyers',
    icon: Users,
    href: '/lawyers',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    title: 'Book Consultation',
    description: 'Schedule a new session',
    icon: Calendar,
    href: '/lawyers',
    color: 'bg-green-500/10 text-green-600',
  },
  {
    title: 'My Messages',
    description: 'View conversations',
    icon: MessageSquare,
    href: '/dashboard/messages',
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    title: 'Documents',
    description: 'Manage your files',
    icon: FileText,
    href: '/dashboard/documents',
    color: 'bg-orange-500/10 text-orange-600',
  },
];

function QuickActions() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {quickActions.map((action) => (
        <Link key={action.title} href={action.href}>
          <Card className="p-4 hover:shadow-md transition-all hover:border-primary/50 h-full">
            <div className="flex items-start gap-4">
              <div className={cn('p-3 rounded-xl', action.color)}>
                <action.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">{action.title}</h3>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

// ============================================
// Main Dashboard Component
// ============================================

export function ClientDashboard() {
  const { user } = useAuthStore();

  // Fetch upcoming consultations
  const { data: consultationsData, isLoading: consultationsLoading } = useQuery({
    queryKey: queryKeys.consultations.list({ status: 'confirmed', limit: 5 }),
    queryFn: () => consultationsApi.getConsultations({ 
      status: 'confirmed', 
      page: 1, 
      limit: 5 
    }),
  });

  // Fetch consultation stats
  const { data: statsData } = useQuery({
    queryKey: queryKeys.consultations.stats(),
    queryFn: () => consultationsApi.getConsultationStats(),
  });

  const upcomingConsultations = consultationsData?.consultations || [];
  const stats = statsData || {
    total: 0,
    pending: 0,
    completed: 0,
    upcoming: 0,
  };

  const greeting = getGreeting();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8"
    >
      {/* Welcome Section */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-2xl font-bold">
          {greeting}, {user?.firstName || 'there'}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your legal consultations.
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={fadeInUp} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Consultations"
          value={stats.total}
          icon={<Calendar className="h-5 w-5" />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Upcoming"
          value={stats.upcoming}
          icon={<Clock className="h-5 w-5" />}
          description="Next 7 days"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<AlertCircle className="h-5 w-5" />}
          variant={stats.pending > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={fadeInUp}>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <QuickActions />
      </motion.div>

      {/* Upcoming Consultations */}
      <motion.div variants={fadeInUp}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Upcoming Consultations</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/consultations">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        {consultationsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex gap-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : upcomingConsultations.length > 0 ? (
          <div className="space-y-4">
            {upcomingConsultations.map((consultation) => (
              <ConsultationCard key={consultation.id} consultation={consultation} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No Upcoming Consultations</h3>
            <p className="text-muted-foreground mb-4">
              You don&apos;t have any scheduled consultations yet.
            </p>
            <Button asChild>
              <Link href="/lawyers">Find a Lawyer</Link>
            </Button>
          </Card>
        )}
      </motion.div>

      {/* Tips Section */}
      <motion.div variants={fadeInUp}>
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Pro Tip</h3>
              <p className="text-muted-foreground text-sm">
                Before your consultation, prepare a list of questions and gather all relevant 
                documents. This helps make the most of your time with the lawyer.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// Helper Functions
// ============================================

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default ClientDashboard;
