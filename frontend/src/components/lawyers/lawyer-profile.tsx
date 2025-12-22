'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Star,
  Video,
  MessageSquare,
  Phone,
  MapPin,
  Clock,
  Calendar,
  Award,
  GraduationCap,
  Languages,
  Building,
  Shield,
  ChevronRight,
  Share2,
  Heart,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Avatar,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Skeleton,
  Separator,
} from '@/components/ui';
import { lawyersApi, reviewsApi, queryKeys } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import type { LawyerProfile, Review } from '@/types';

// ============================================
// Types
// ============================================

interface LawyerProfilePageProps {
  lawyerId: string;
}

// ============================================
// Stats Card
// ============================================

function StatsCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ============================================
// Review Card
// ============================================

function ReviewCard({ review }: { review: Review }) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar
            size="md"
            fallback={review.clientName?.split(' ').map(n => n[0]).join('') || 'A'}
          />
          <div>
            <p className="font-medium">{review.isAnonymous ? 'Anonymous' : review.clientName}</p>
            <p className="text-sm text-muted-foreground">{formatDate(review.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'h-4 w-4',
                i < review.rating
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-muted-foreground'
              )}
            />
          ))}
        </div>
      </div>
      {review.title && (
        <h4 className="font-medium mb-2">{review.title}</h4>
      )}
      <p className="text-muted-foreground">{review.content}</p>
      {review.lawyerResponse && (
        <div className="mt-4 p-4 rounded-lg bg-muted/50 border-l-2 border-primary">
          <p className="text-sm font-medium mb-1">Lawyer&apos;s Response:</p>
          <p className="text-sm text-muted-foreground">{review.lawyerResponse}</p>
        </div>
      )}
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

export function LawyerProfilePage({ lawyerId }: LawyerProfilePageProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch lawyer profile
  const { data: lawyer, isLoading: lawyerLoading } = useQuery({
    queryKey: queryKeys.lawyers.detail(lawyerId),
    queryFn: () => lawyersApi.getLawyerById(lawyerId),
  });

  // Fetch lawyer reviews
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: queryKeys.reviews.byLawyer(lawyerId),
    queryFn: () => reviewsApi.getLawyerReviews(lawyerId, { page: 1, limit: 10 }),
    enabled: activeTab === 'reviews',
  });

  const reviews = reviewsData?.reviews || [];

  if (lawyerLoading) {
    return <LawyerProfileSkeleton />;
  }

  if (!lawyer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Lawyer Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The lawyer profile you&apos;re looking for doesn&apos;t exist.
          </p>
          <Button asChild>
            <Link href="/lawyers">Browse Lawyers</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const initials = `${lawyer.firstName?.[0] || ''}${lawyer.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background py-8">
        <div className="container">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-6"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lawyers
          </Button>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row gap-6">
                <Avatar
                  size="2xl"
                  src={lawyer.profilePhoto || undefined}
                  fallback={initials}
                  className="w-32 h-32"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl lg:text-3xl font-bold">
                      Adv. {lawyer.firstName} {lawyer.lastName}
                    </h1>
                    {lawyer.isVerified && (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>

                  <p className="text-lg text-muted-foreground mb-4">
                    {lawyer.practiceAreas?.[0]} Specialist
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      {lawyer.rating?.toFixed(1) || 'N/A'} ({lawyer.totalReviews || 0} reviews)
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {lawyer.yearsOfExperience} years experience
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {lawyer.city}, {lawyer.state}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {lawyer.practiceAreas?.map((area) => (
                      <Badge key={area} variant="secondary">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Card */}
            <Card className="p-6 w-full lg:w-80 h-fit">
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-primary">₹{lawyer.consultationFee}</p>
                <p className="text-muted-foreground">per consultation</p>
              </div>

              <div className="flex flex-col gap-3 mb-6">
                {lawyer.isAvailableForVideo && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Video className="h-5 w-5 text-primary" />
                    <span>Video Consultation Available</span>
                  </div>
                )}
                {lawyer.isAvailableForChat && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <span>Chat Consultation Available</span>
                  </div>
                )}
                {lawyer.isAvailableForCall && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Phone className="h-5 w-5 text-primary" />
                    <span>Phone Consultation Available</span>
                  </div>
                )}
              </div>

              <Button
                size="lg"
                className="w-full mb-3"
                asChild
              >
                <Link href={isAuthenticated ? `/book/${lawyer.id}` : `/login?redirect=/book/${lawyer.id}`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Book Consultation
                </Link>
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" className="flex-1">
                  <Heart className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Stats */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                icon={Clock}
                label="Years Experience"
                value={lawyer.yearsOfExperience}
              />
              <StatsCard
                icon={Star}
                label="Average Rating"
                value={lawyer.rating?.toFixed(1) || 'N/A'}
              />
              <StatsCard
                icon={MessageSquare}
                label="Total Reviews"
                value={lawyer.totalReviews || 0}
              />
              <StatsCard
                icon={Calendar}
                label="Consultations"
                value={lawyer.totalConsultations || 0}
              />
            </div>

            {/* About */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p className="text-muted-foreground whitespace-pre-line">
                {lawyer.bio || 'No bio available.'}
              </p>
            </Card>

            {/* Practice Areas */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Practice Areas</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lawyer.practiceAreas?.map((area) => (
                  <div key={area} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Award className="h-4 w-4 text-primary" />
                    </div>
                    <span>{area}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Languages & Courts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Languages className="h-5 w-5" />
                  Languages
                </h2>
                <div className="flex flex-wrap gap-2">
                  {lawyer.languages?.map((lang) => (
                    <Badge key={lang} variant="secondary">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Courts
                </h2>
                <div className="flex flex-wrap gap-2">
                  {lawyer.courts?.map((court) => (
                    <Badge key={court} variant="secondary">
                      {court}
                    </Badge>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="experience" className="space-y-8">
            {/* Bar Council */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Bar Council Registration
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Registration Number</p>
                  <p className="font-medium">{lawyer.barCouncilNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">State Bar Council</p>
                  <p className="font-medium">{lawyer.barCouncilState}</p>
                </div>
              </div>
            </Card>

            {/* Education */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Education
              </h2>
              <div className="space-y-4">
                {lawyer.education?.map((edu, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{edu.degree}</p>
                      <p className="text-sm text-muted-foreground">
                        {edu.institution} • {edu.year}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            {/* Rating Summary */}
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row gap-8 items-center">
                <div className="text-center">
                  <p className="text-5xl font-bold">{lawyer.rating?.toFixed(1) || 'N/A'}</p>
                  <div className="flex justify-center gap-1 my-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'h-5 w-5',
                          i < Math.round(lawyer.rating || 0)
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-muted-foreground'
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground">{lawyer.totalReviews || 0} reviews</p>
                </div>
                <Separator orientation="vertical" className="h-24 hidden sm:block" />
                <div className="flex-1 space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center gap-3">
                      <span className="w-3">{rating}</span>
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500"
                          style={{ width: `${Math.random() * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Reviews List */}
            {reviewsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="flex gap-4">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No reviews yet.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ============================================
// Skeleton
// ============================================

function LawyerProfileSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-gradient-to-br from-primary/10 via-background to-background py-8">
        <div className="container">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="flex gap-6">
                <Skeleton className="w-32 h-32 rounded-full" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
            <Skeleton className="w-full lg:w-80 h-64 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LawyerProfilePage;
