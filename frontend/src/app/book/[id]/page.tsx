'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { lawyerApi, type LawyerProfile } from '@/lib/api/lawyer';
import { Spinner, useToast } from '@/components/ui';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Video, 
  Phone as PhoneIcon, 
  MapPin,
  Star,
  Shield,
  IndianRupee
} from 'lucide-react';

interface TimeSlot {
  time: string;
  available: boolean;
}

export default function BookLawyerPage() {
  const router = useRouter();
  const params = useParams();
  const lawyerId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const { toast } = useToast();

  const [lawyer, setLawyer] = useState<LawyerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedType, setSelectedType] = useState<'video' | 'audio' | 'in_person'>('video');
  const [isBooking, setIsBooking] = useState(false);

  // Generate next 7 days
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i + 1);
    return {
      value: date.toISOString().split('T')[0],
      label: date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  });

  // Sample time slots
  const timeSlots: TimeSlot[] = [
    { time: '09:00', available: true },
    { time: '10:00', available: true },
    { time: '11:00', available: false },
    { time: '12:00', available: true },
    { time: '14:00', available: true },
    { time: '15:00', available: true },
    { time: '16:00', available: false },
    { time: '17:00', available: true },
  ];

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=/book/${lawyerId}`);
      return;
    }

    const fetchLawyer = async () => {
      try {
        const response = await lawyerApi.getProfile(lawyerId);
        setLawyer(response);
      } catch (error) {
        console.error('Failed to fetch lawyer:', error);
        toast({
          title: 'Error',
          description: 'Failed to load lawyer details',
          variant: 'error',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && lawyerId) {
      fetchLawyer();
    }
  }, [lawyerId, isAuthenticated, authLoading, router, toast]);

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Select Date & Time',
        description: 'Please select a date and time for your consultation',
        variant: 'error',
      });
      return;
    }

    setIsBooking(true);
    try {
      // TODO: Implement booking API
      toast({
        title: 'Booking Confirmed!',
        description: `Your consultation with ${lawyer?.user?.displayName} is scheduled for ${selectedDate} at ${selectedTime}`,
        variant: 'success',
      });
      router.push('/dashboard');
    } catch {
      toast({
        title: 'Booking Failed',
        description: 'Could not complete booking. Please try again.',
        variant: 'error',
      });
    } finally {
      setIsBooking(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!lawyer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Lawyer Not Found</h1>
        <Link href="/lawyers" className="text-primary hover:underline">
          Browse Lawyers
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <Link
          href={`/lawyers/${lawyerId}`}
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Profile
        </Link>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Booking Form */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-card rounded-xl border p-6">
              <h1 className="text-2xl font-bold mb-6">Book Consultation</h1>

              {/* Consultation Type */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">Consultation Type</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: 'video' as const, icon: Video, label: 'Video Call' },
                    { type: 'audio' as const, icon: PhoneIcon, label: 'Audio Call' },
                    { type: 'in_person' as const, icon: MapPin, label: 'In Person' },
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`p-4 rounded-lg border text-center transition-all ${
                        selectedType === type
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      <Icon className="h-6 w-6 mx-auto mb-2" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Select Date
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {dates.map((date) => (
                    <button
                      key={date.value}
                      onClick={() => setSelectedDate(date.value)}
                      className={`p-3 rounded-lg border text-center text-sm transition-all ${
                        selectedDate === date.value
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      {date.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Select Time
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      className={`p-3 rounded-lg border text-center text-sm transition-all ${
                        !slot.available
                          ? 'opacity-50 cursor-not-allowed bg-muted'
                          : selectedTime === slot.time
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:border-primary/50'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Book Button */}
              <button
                onClick={handleBooking}
                disabled={isBooking || !selectedDate || !selectedTime}
                className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBooking ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Booking...
                  </>
                ) : (
                  `Confirm Booking - ₹${lawyer.consultationFee}`
                )}
              </button>
            </div>
          </div>

          {/* Lawyer Summary */}
          <div className="md:col-span-1">
            <div className="bg-card rounded-xl border p-6 sticky top-4">
              <div className="text-center mb-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl font-bold text-primary">
                    {lawyer.user?.firstName?.charAt(0)}{lawyer.user?.lastName?.charAt(0)}
                  </span>
                </div>
                <h2 className="font-semibold">{lawyer.user?.displayName}</h2>
                <p className="text-sm text-muted-foreground">{lawyer.specialization}</p>
                {lawyer.isVerified && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 mt-1">
                    <Shield className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Experience</span>
                  <span className="font-medium">{lawyer.experienceYears} years</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {lawyer.rating?.toFixed(1) || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-medium">{lawyer.officeCity || 'N/A'}</span>
                </div>
                <hr className="my-3" />
                <div className="flex items-center justify-between text-lg">
                  <span className="font-medium">Consultation Fee</span>
                  <span className="font-bold text-primary flex items-center">
                    <IndianRupee className="h-4 w-4" />
                    {lawyer.consultationFee}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
