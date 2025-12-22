'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  ChevronRight,
  Video,
  Star,
  DollarSign,
  TrendingUp,
  Settings,
  CheckCircle,
  AlertCircle,
  Eye,
  Phone,
  MessageSquare,
  FileText,
  RefreshCw,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import {
  Card,
  StatCard,
  Badge,
  Button,
  Avatar,
  Skeleton,
  Alert,
  Spinner,
} from '@/components/ui';
import { useAuthStore } from '@/stores';
import { lawyerApi } from '@/lib/api/lawyer';
import { cn, formatCurrency } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface DashboardData {
  profile: {
    rating: number;
    total_reviews: number;
    total_consultations: number;
    is_available: boolean;
    profile_completion: number;
  };
  today: {
    consultations: number;
    schedule: Array<{
      id: string;
      time: string;
      status: string;
      client_name: string;
    }>;
  };
  month: {
    total: number;
    completed: number;
    cancelled: number;
    earnings: number;
    completion_rate: number;
  };
  pending_actions: {
    reviews_to_respond: number;
  };
}

interface ConsultationItem {
  id: string;
  reference: string;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
  };
  booking: {
    date: string;
    time: string;
    type: string;
    duration: number;
  };
  status: string;
  amount: number;
  payment_status: string;
  problem_description: string;
  meeting_link?: string;
  notes?: string;
  created_at: string;
}

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
// Registration Status Component
// ============================================

interface RegistrationStatusProps {
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_changes';
  submittedAt: string;
  reviewNotes?: string | null;
  rejectionReason?: string | null;
}

function RegistrationStatusCard({ status, submittedAt, reviewNotes, rejectionReason }: RegistrationStatusProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      title: 'Registration Pending',
      description: 'Your lawyer registration is pending review. We will notify you once the review is complete.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    under_review: {
      icon: Eye,
      title: 'Under Review',
      description: 'Your application is currently being reviewed by our team. This typically takes 3-5 business days.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    approved: {
      icon: CheckCircle,
      title: 'Registration Approved',
      description: 'Congratulations! Your lawyer registration has been approved. You can now start accepting consultations.',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    rejected: {
      icon: XCircle,
      title: 'Registration Rejected',
      description: rejectionReason || 'Your registration was rejected. Please contact support for more information.',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    requires_changes: {
      icon: AlertCircle,
      title: 'Changes Required',
      description: reviewNotes || 'Please update your application based on the reviewer feedback.',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className={cn('p-6 border-2', config.bgColor, config.borderColor)}>
      <div className="flex items-start gap-4">
        <div className={cn('p-3 rounded-full', config.bgColor)}>
          <Icon className={cn('h-6 w-6', config.color)} />
        </div>
        <div className="flex-1">
          <h2 className={cn('text-lg font-semibold', config.color)}>{config.title}</h2>
          <p className="text-muted-foreground mt-1">{config.description}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Submitted: {new Date(submittedAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          
          {status === 'requires_changes' && (
            <Button className="mt-4" style={{ background: '#4F46E5', color: '#fff' }} asChild>
              <Link href="/lawyer/register?edit=true">
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Application
              </Link>
            </Button>
          )}
          
          {status === 'rejected' && (
            <Button className="mt-4" variant="outline" asChild>
              <Link href="/support">
                <HelpCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// ============================================
// No Registration Card
// ============================================

function NoRegistrationCard() {
  return (
    <Card className="p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center">
        <FileText className="h-10 w-10 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Not Registered as Lawyer</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        You haven&apos;t applied for lawyer registration yet. Register now to start accepting consultations and help clients with their legal needs.
      </p>
      <Button style={{ background: '#4F46E5', color: '#fff' }} size="lg" asChild>
        <Link href="/lawyer/register">
          Apply for Lawyer Registration
          <ChevronRight className="h-4 w-4 ml-2" />
        </Link>
      </Button>
    </Card>
  );
}

// ============================================
// Consultation Card
// ============================================

interface ConsultationCardProps {
  consultation: ConsultationItem;
}

function ConsultationCard({ consultation }: ConsultationCardProps) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    confirmed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    in_progress: 'bg-green-500/10 text-green-600 border-green-500/20',
    completed: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
    no_show: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  };

  const typeIcons: Record<string, typeof Video> = {
    video: Video,
    audio: Phone,
    chat: MessageSquare,
  };
  
  const TypeIcon = typeIcons[consultation.booking.type] || Video;

  const clientInitials = consultation.client.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="p-4 hover:shadow-md transition-all">
      <div className="flex gap-4">
        <Avatar
          size="lg"
          src={consultation.client.avatar}
          fallback={clientInitials}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium truncate">{consultation.client.name}</h4>
              <p className="text-sm text-muted-foreground truncate">
                Ref: {consultation.reference}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn('capitalize shrink-0', statusColors[consultation.status] || statusColors.pending)}
            >
              {consultation.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(consultation.booking.date).toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {consultation.booking.time}
            </span>
            <span className="flex items-center gap-1">
              <TypeIcon className="h-4 w-4" />
              {consultation.booking.type}
            </span>
            <span className="font-medium text-foreground">
              {formatCurrency(consultation.amount)}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {consultation.status === 'confirmed' && consultation.meeting_link && (
            <Button size="sm" style={{ background: '#4F46E5', color: '#fff' }} asChild>
              <a href={consultation.meeting_link} target="_blank" rel="noopener noreferrer">
                <Video className="h-4 w-4 mr-1" />
                Join
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link href={`/lawyer/consultations/${consultation.id}`}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// Today's Schedule Card
// ============================================

interface TodayScheduleProps {
  schedule: Array<{
    id: string;
    time: string;
    status: string;
    client_name: string;
  }>;
}

function TodaySchedule({ schedule }: TodayScheduleProps) {
  if (schedule.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Today&apos;s Schedule</h3>
        <div className="text-center py-6">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No consultations scheduled for today</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Today&apos;s Schedule</h3>
      <div className="space-y-3">
        {schedule.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium">{item.time}</div>
              <div className="text-sm text-muted-foreground">{item.client_name}</div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'capitalize text-xs',
                item.status === 'confirmed' ? 'bg-blue-500/10 text-blue-600' : 'bg-yellow-500/10 text-yellow-600'
              )}
            >
              {item.status}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================
// Monthly Stats Card
// ============================================

interface MonthlyStatsProps {
  stats: DashboardData['month'];
}

function MonthlyStats({ stats }: MonthlyStatsProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-semibold">This Month</h3>
          <p className="text-2xl font-bold mt-1">
            {formatCurrency(stats.earnings)}
          </p>
        </div>
        {stats.completion_rate > 0 && (
          <Badge variant="success" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            {stats.completion_rate}% completion
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-primary">{stats.total}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-xs text-muted-foreground">Completed</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
          <div className="text-xs text-muted-foreground">Cancelled</div>
        </div>
      </div>
    </Card>
  );
}

// ============================================
// Profile Completion Card
// ============================================

interface ProfileCompletionProps {
  completion: number;
  isAvailable: boolean;
}

function ProfileCompletionCard({ completion, isAvailable }: ProfileCompletionProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Profile Status</h3>
        <Badge variant={isAvailable ? 'success' : 'secondary'}>
          {isAvailable ? 'Online' : 'Offline'}
        </Badge>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Profile Completion</span>
            <span className="font-medium">{completion}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
        
        {completion < 100 && (
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/lawyer/profile">
              Complete Profile
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
        
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/lawyer/availability">
            Manage Availability
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

// ============================================
// Main Dashboard Component
// ============================================

export function LawyerDashboard() {
  const { user } = useAuthStore();

  // Fetch registration status first
  const {
    data: registrationStatus,
    isLoading: statusLoading,
    error: statusError,
  } = useQuery({
    queryKey: ['lawyer', 'registration-status'],
    queryFn: () => lawyerApi.getRegistrationStatus(),
    staleTime: 30 * 1000,
  });

  // Only fetch dashboard if user has a verified lawyer profile
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
  } = useQuery({
    queryKey: ['lawyer', 'dashboard'],
    queryFn: async () => {
      const response = await lawyerApi.getDashboard();
      return response.dashboard;
    },
    enabled: registrationStatus?.hasLawyerProfile && registrationStatus?.lawyer?.isVerified,
    staleTime: 60 * 1000,
  });

  // Fetch recent consultations
  const {
    data: consultationsData,
    isLoading: consultationsLoading,
  } = useQuery({
    queryKey: ['lawyer', 'consultations', { limit: 5 }],
    queryFn: async () => {
      const response = await lawyerApi.getMyConsultations({ limit: 5 });
      return response;
    },
    enabled: registrationStatus?.hasLawyerProfile && registrationStatus?.lawyer?.isVerified,
    staleTime: 60 * 1000,
  });

  const greeting = getGreeting();

  // Loading state
  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (statusError) {
    return (
      <div className="p-6">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2">Failed to load dashboard. Please try again later.</span>
        </Alert>
      </div>
    );
  }

  // No registration - show registration prompt
  if (!registrationStatus?.hasLawyerProfile && !registrationStatus?.registration) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="space-y-8"
      >
        <motion.div variants={fadeInUp}>
          <h1 className="text-2xl font-bold">{greeting}, {user?.firstName || 'there'}!</h1>
          <p className="text-muted-foreground mt-1">Welcome to Nyaay Saathi</p>
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <NoRegistrationCard />
        </motion.div>
      </motion.div>
    );
  }

  // Has pending/rejected registration - show status
  if (!registrationStatus?.hasLawyerProfile && registrationStatus?.registration) {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="space-y-8"
      >
        <motion.div variants={fadeInUp}>
          <h1 className="text-2xl font-bold">{greeting}, {user?.firstName || 'there'}!</h1>
          <p className="text-muted-foreground mt-1">Your lawyer registration status</p>
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <RegistrationStatusCard
            status={registrationStatus.registration.status}
            submittedAt={registrationStatus.registration.submittedAt}
            reviewNotes={registrationStatus.registration.reviewNotes}
            rejectionReason={registrationStatus.registration.rejectionReason}
          />
        </motion.div>
        
        <motion.div variants={fadeInUp}>
          <Card className="p-6">
            <h3 className="font-semibold mb-4">What happens next?</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Document Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    Our team verifies your Bar Council certificate and other documents.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-primary">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Profile Approval</h4>
                  <p className="text-sm text-muted-foreground">
                    Once verified, your profile will be approved and you&apos;ll be notified via email.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium text-primary">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Start Consulting</h4>
                  <p className="text-sm text-muted-foreground">
                    Set your availability and start accepting consultation requests.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  // Has verified lawyer profile - show full dashboard
  const dashboard = dashboardData;
  const consultations = consultationsData?.consultations || [];

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
            {dashboard?.today?.consultations
              ? `You have ${dashboard.today.consultations} consultation${dashboard.today.consultations > 1 ? 's' : ''} scheduled for today.`
              : 'No consultations scheduled for today.'}
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Today's Consultations"
            value={dashboard?.today?.consultations || 0}
            icon={<Calendar className="h-5 w-5" />}
            description={`${dashboard?.today?.schedule?.filter(s => s.status === 'confirmed').length || 0} confirmed`}
          />
          <StatCard
            title="Month's Earnings"
            value={formatCurrency(dashboard?.month?.earnings || 0)}
            icon={<DollarSign className="h-5 w-5" />}
            trend={dashboard?.month?.completion_rate ? { value: dashboard.month.completion_rate, isPositive: true } : undefined}
          />
          <StatCard
            title="Average Rating"
            value={dashboard?.profile?.rating?.toFixed(1) || 'N/A'}
            icon={<Star className="h-5 w-5" />}
            description={`${dashboard?.profile?.total_reviews || 0} reviews`}
          />
          <StatCard
            title="Pending Reviews"
            value={dashboard?.pending_actions?.reviews_to_respond || 0}
            icon={<MessageSquare className="h-5 w-5" />}
            description="To respond"
          />
        </div>
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

          {consultationsLoading || dashboardLoading ? (
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
              <h3 className="font-semibold mb-2">No Consultations Yet</h3>
              <p className="text-muted-foreground">
                You don&apos;t have any consultations yet. Make sure your profile is complete and you&apos;re marked as available.
              </p>
            </Card>
          )}
        </motion.div>

        {/* Sidebar */}
        <motion.div variants={fadeInUp} className="space-y-6">
          {/* Today's Schedule */}
          {dashboard && (
            <TodaySchedule schedule={dashboard.today?.schedule || []} />
          )}

          {/* Monthly Stats */}
          {dashboard && (
            <MonthlyStats stats={dashboard.month} />
          )}

          {/* Profile Completion */}
          {dashboard && (
            <ProfileCompletionCard
              completion={dashboard.profile?.profile_completion || 0}
              isAvailable={dashboard.profile?.is_available || false}
            />
          )}
        </motion.div>
      </div>

      {/* Tips Section */}
      <motion.div variants={fadeInUp}>
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex gap-4">
            <div className="p-3 rounded-xl bg-primary/20 shrink-0">
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
