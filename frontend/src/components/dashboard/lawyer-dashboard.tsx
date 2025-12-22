'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  MessageSquare,
  Clock,
  ChevronRight,
  Video,
  Star,
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Settings,
  CheckCircle,
  AlertCircle,
  Eye,
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
import { cn, formatDate, formatTime, formatCurrency } from '@/lib/utils';
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
// Consultation Card for Lawyers
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

  const clientName = consultation.client 
    ? `${consultation.client.firstName} ${consultation.client.lastName}`
    : 'Unknown Client';
  
  const clientInitials = consultation.client
    ? `${consultation.client.firstName?.[0] || ''}${consultation.client.lastName?.[0] || ''}`.toUpperCase()
    : 'UC';

  return (
    <Card className="p-4 hover:shadow-md transition-all">
      <div className="flex gap-4">
        <Avatar
          size="lg"
          fallback={clientInitials}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium truncate">{clientName}</h4>
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
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {consultation.status === 'pending' && (
            <>
              <Button size="sm" variant="default">Accept</Button>
              <Button size="sm" variant="outline">Decline</Button>
            </>
          )}
          {consultation.status === 'confirmed' && (
            <Button size="sm" variant="default">
              <Video className="h-4 w-4 mr-1" />
              Join
            </Button>
          )}
          {(consultation.status === 'completed' || consultation.status === 'cancelled') && (
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 mr-1" />
              View
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================
// Earnings Chart (Simplified)
// ============================================

function EarningsOverview() {
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const earnings = [2500, 4000, 3000, 5500, 4500, 2000, 3500]; // Mock data

  const maxEarning = Math.max(...earnings);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold">Weekly Earnings</h3>
          <p className="text-2xl font-bold mt-1">
            {formatCurrency(earnings.reduce((a, b) => a + b, 0))}
          </p>
        </div>
        <Badge variant="success" className="gap-1">
          <TrendingUp className="h-3 w-3" />
          +12%
        </Badge>
      </div>

      <div className="flex items-end justify-between gap-2 h-32">
        {earnings.map((amount, index) => (
          <div key={weekDays[index]} className="flex-1 flex flex-col items-center gap-2">
            <div
              className="w-full bg-primary/20 rounded-t-sm transition-all hover:bg-primary/40"
              style={{ height: `${(amount / maxEarning) * 100}%` }}
            />
            <span className="text-xs text-muted-foreground">{weekDays[index]}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================
// Quick Stats for Lawyers
// ============================================

function QuickStats() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Today's Consultations"
        value={3}
        icon={<Calendar className="h-5 w-5" />}
        description="2 video, 1 chat"
      />
      <StatCard
        title="Pending Requests"
        value={5}
        icon={<AlertCircle className="h-5 w-5" />}
        variant="warning"
        action={{ label: 'Review', href: '/lawyer/consultations?status=pending' }}
      />
      <StatCard
        title="This Month's Earnings"
        value={formatCurrency(45000)}
        icon={<DollarSign className="h-5 w-5" />}
        trend={{ value: 8, isPositive: true }}
      />
      <StatCard
        title="Average Rating"
        value="4.9"
        icon={<Star className="h-5 w-5" />}
        description="Based on 128 reviews"
      />
    </div>
  );
}

// ============================================
// Main Dashboard Component
// ============================================

export function LawyerDashboard() {
  const { user } = useAuthStore();

  // Fetch today's consultations
  const { data: consultationsData, isLoading: consultationsLoading } = useQuery({
    queryKey: queryKeys.consultations.list({ limit: 5 }),
    queryFn: () => consultationsApi.getConsultations({ 
      page: 1, 
      limit: 5 
    }),
  });

  const consultations = consultationsData?.consultations || [];
  const greeting = getGreeting();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-8"
    >
      {/* Welcome Section */}
      <motion.div variants={fadeInUp} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}, Adv. {user?.lastName || 'Counselor'}! ⚖️
          </h1>
          <p className="text-muted-foreground mt-1">
            You have 3 consultations scheduled for today.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/lawyer/settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </Button>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={fadeInUp}>
        <QuickStats />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Consultations */}
        <motion.div variants={fadeInUp} className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Consultations</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/lawyer/consultations">
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
          ) : consultations.length > 0 ? (
            <div className="space-y-4">
              {consultations.map((consultation) => (
                <ConsultationCard key={consultation.id} consultation={consultation} />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No Consultations</h3>
              <p className="text-muted-foreground">
                No consultation requests at the moment.
              </p>
            </Card>
          )}
        </motion.div>

        {/* Sidebar */}
        <motion.div variants={fadeInUp} className="space-y-6">
          {/* Earnings */}
          <EarningsOverview />

          {/* Profile Completion */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Profile Completion</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">85% Complete</span>
                  <span className="font-medium">85/100</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-primary rounded-full" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Basic Information</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Bar Council Verified</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Add profile photo</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="/lawyer/profile">Complete Profile</Link>
              </Button>
            </div>
          </Card>

          {/* Availability */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Availability</h3>
              <Badge variant="success">Online</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Your profile is visible and accepting new consultation requests.
            </p>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/lawyer/availability">Manage Schedule</Link>
            </Button>
          </Card>
        </motion.div>
      </div>

      {/* Tips Section */}
      <motion.div variants={fadeInUp}>
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex gap-4">
            <div className="p-3 rounded-xl bg-primary/20">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Boost Your Profile</h3>
              <p className="text-muted-foreground text-sm">
                Lawyers with complete profiles and quick response times get 3x more consultation 
                requests. Update your availability regularly for best results.
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

export default LawyerDashboard;
