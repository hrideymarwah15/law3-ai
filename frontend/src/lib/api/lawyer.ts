import { api } from "./client";

// ============================================
// Types
// ============================================

export interface LawyerProfile {
  id: string;
  userId: string;
  barCouncilNumber: string;
  barCouncilState: string;
  specialization: string;
  specializations: string[];
  experienceYears: number;
  bio: string;
  headline?: string;
  consultationFee: number;
  rating: number;
  totalReviews: number;
  totalConsultations: number;
  isVerified: boolean;
  isAvailable: boolean;
  profilePhoto?: string;
  officeCity: string;
  officeState: string;
  practiceAreas: string[];
  languagesSpoken: string[];
  courtsPracticed: string[];
  user?: {
    firstName: string;
    lastName: string;
    displayName: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  };
}

export interface LawyerSearchParams {
  specialization?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  page?: number;
  limit?: number;
}

export interface LawyerRegistrationData {
  bar_council_number: string;
  bar_council_state: string;
  bar_council_enrollment_date?: string;
  license_number?: string;
  specialization: string;
  specializations?: string[];
  experience_years: number;
  bio: string;
  headline?: string;
  consultation_fee: number;
  consultation_duration?: number;
  office_name?: string;
  office_address?: string;
  office_city: string;
  office_state: string;
  office_pincode?: string;
  office_phone?: string;
  office_email?: string;
  education: Array<{
    degree: string;
    institution: string;
    year: number;
    grade?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    year: number;
    valid_until?: string;
  }>;
  languages_spoken: string[];
  practice_areas: string[];
  courts_practiced?: string[];
  bar_council_certificate_url: string;
  id_proof_type: string;
  id_proof_url: string;
  address_proof_url?: string;
  profile_photo_url?: string;
  additional_documents?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

export interface RegistrationStatus {
  hasLawyerProfile: boolean;
  lawyer?: {
    id: string;
    verificationStatus: string;
    isVerified: boolean;
    verifiedAt?: string;
    isAvailable: boolean;
    profileCompletion: number;
  };
  registration?: {
    id: string;
    status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_changes';
    submissionCount: number;
    submittedAt: string;
    reviewedAt?: string;
    reviewNotes?: string;
    rejectionReason?: string;
  };
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

// ============================================
// Backend Response Types
// ============================================

interface BackendLawyerResponse {
  success: boolean;
  lawyer: {
    id: string;
    user_id: string;
    bar_council_number: string;
    bar_council_state: string;
    specialization: string;
    specializations: string[];
    experience_years: number;
    bio: string;
    headline?: string;
    consultation_fee: number;
    rating: number;
    total_reviews: number;
    total_consultations: number;
    is_verified: boolean;
    is_available: boolean;
    profile_photo_url?: string;
    office_city: string;
    office_state: string;
    practice_areas: string[];
    languages_spoken: string[];
    courts_practiced: string[];
    users?: {
      first_name: string;
      last_name: string;
      display_name: string;
      email: string;
      phone?: string;
      avatar_url?: string;
    };
  };
}

interface BackendRegistrationStatusResponse {
  success: boolean;
  has_lawyer_profile: boolean;
  lawyer?: {
    id: string;
    verification_status: string;
    is_verified: boolean;
    verified_at?: string;
    is_available: boolean;
    profile_completion: number;
  };
  registration?: {
    id: string;
    status: string;
    submission_count: number;
    submitted_at: string;
    reviewed_at?: string;
    review_notes?: string;
    rejection_reason?: string;
  };
}

// ============================================
// Transform Functions
// ============================================

function transformLawyer(data: BackendLawyerResponse['lawyer']): LawyerProfile {
  return {
    id: data.id,
    userId: data.user_id,
    barCouncilNumber: data.bar_council_number,
    barCouncilState: data.bar_council_state,
    specialization: data.specialization,
    specializations: data.specializations || [],
    experienceYears: data.experience_years,
    bio: data.bio,
    headline: data.headline,
    consultationFee: data.consultation_fee,
    rating: data.rating,
    totalReviews: data.total_reviews,
    totalConsultations: data.total_consultations,
    isVerified: data.is_verified,
    isAvailable: data.is_available,
    profilePhoto: data.profile_photo_url,
    officeCity: data.office_city,
    officeState: data.office_state,
    practiceAreas: data.practice_areas || [],
    languagesSpoken: data.languages_spoken || [],
    courtsPracticed: data.courts_practiced || [],
    user: data.users ? {
      firstName: data.users.first_name,
      lastName: data.users.last_name,
      displayName: data.users.display_name,
      email: data.users.email,
      phone: data.users.phone,
      avatarUrl: data.users.avatar_url,
    } : undefined,
  };
}

// ============================================
// Lawyer API
// ============================================

export const lawyerApi = {
  // Search lawyers (public)
  search: async (params: LawyerSearchParams = {}) => {
    const queryParams = new URLSearchParams();
    if (params.specialization) queryParams.set('specialization', params.specialization);
    if (params.city) queryParams.set('city', params.city);
    if (params.minPrice) queryParams.set('min_price', params.minPrice.toString());
    if (params.maxPrice) queryParams.set('max_price', params.maxPrice.toString());
    if (params.minRating) queryParams.set('min_rating', params.minRating.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());

    const response = await api.get<{
      success: boolean;
      total: number;
      page: number;
      limit: number;
      lawyers: Array<BackendLawyerResponse['lawyer']>;
    }>(`/lawyers/search?${queryParams.toString()}`);

    return {
      total: response.total,
      page: response.page,
      limit: response.limit,
      lawyers: response.lawyers.map(transformLawyer),
    };
  },

  // Get lawyer profile (public)
  getProfile: async (lawyerId: string) => {
    const response = await api.get<BackendLawyerResponse>(`/lawyers/${lawyerId}`);
    return transformLawyer(response.lawyer);
  },

  // Get lawyer availability (public)
  getAvailability: async (lawyerId: string, date: string) => {
    const response = await api.get<{
      success: boolean;
      date: string;
      slots: Array<{ time: string; available: boolean }>;
    }>(`/lawyers/${lawyerId}/availability?date=${date}`);
    return response.slots;
  },

  // Submit lawyer registration (authenticated)
  submitRegistration: async (data: LawyerRegistrationData) => {
    const response = await api.post<{
      success: boolean;
      message: string;
      request: {
        id: string;
        status: string;
        submitted_at: string;
      };
    }>('/lawyers/register', data);
    return response;
  },

  // Get registration status (authenticated)
  getRegistrationStatus: async (): Promise<RegistrationStatus> => {
    const response = await api.get<BackendRegistrationStatusResponse>('/lawyers/registration-status');
    
    let registration: RegistrationStatus['registration'] = undefined;
    if (response.registration) {
      const regStatus = response.registration.status as 'pending' | 'under_review' | 'approved' | 'rejected' | 'requires_changes';
      registration = {
        id: response.registration.id,
        status: regStatus,
        submissionCount: response.registration.submission_count,
        submittedAt: response.registration.submitted_at,
        reviewedAt: response.registration.reviewed_at,
        reviewNotes: response.registration.review_notes,
        rejectionReason: response.registration.rejection_reason,
      };
    }
    
    return {
      hasLawyerProfile: response.has_lawyer_profile,
      lawyer: response.lawyer ? {
        id: response.lawyer.id,
        verificationStatus: response.lawyer.verification_status,
        isVerified: response.lawyer.is_verified,
        verifiedAt: response.lawyer.verified_at,
        isAvailable: response.lawyer.is_available,
        profileCompletion: response.lawyer.profile_completion,
      } : undefined,
      registration,
    };
  },

  // Update registration (authenticated - for resubmission)
  updateRegistration: async (data: Partial<LawyerRegistrationData>) => {
    const response = await api.put<{
      success: boolean;
      message: string;
      request: {
        id: string;
        status: string;
        submission_count: number;
        submitted_at: string;
      };
    }>('/lawyers/registration', data);
    return response;
  },

  // Withdraw registration (authenticated)
  withdrawRegistration: async () => {
    return api.delete<{ success: boolean; message: string }>('/lawyers/registration');
  },

  // ============================================
  // Verified Lawyer Routes
  // ============================================

  // Get own profile (verified lawyer)
  getMyProfile: async () => {
    const response = await api.get<BackendLawyerResponse>('/lawyers/me');
    return transformLawyer(response.lawyer);
  },

  // Update own profile (verified lawyer)
  updateMyProfile: async (data: Partial<{
    bio: string;
    headline: string;
    consultation_fee: number;
    is_available: boolean;
    is_accepting_new_clients: boolean;
    office_phone: string;
    office_email: string;
    website_url: string;
    linkedin_url: string;
    office_name: string;
    office_address: string;
    office_city: string;
    office_state: string;
    office_pincode: string;
    specializations: string[];
    practice_areas: string[];
    courts_practiced: string[];
    languages_spoken: string[];
    profile_photo_url: string;
    accepts_video: boolean;
    accepts_audio: boolean;
    accepts_in_person: boolean;
  }>) => {
    const response = await api.put<{
      success: boolean;
      message: string;
      lawyer: BackendLawyerResponse['lawyer'];
    }>('/lawyers/me', data);
    return {
      message: response.message,
      lawyer: transformLawyer(response.lawyer),
    };
  },

  // Get dashboard stats (verified lawyer)
  getDashboard: async () => {
    return api.get<{
      success: boolean;
      dashboard: {
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
      };
    }>('/lawyers/me/dashboard');
  },

  // Get own consultations (verified lawyer)
  getMyConsultations: async (params: {
    status?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    limit?: number;
  } = {}) => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.set('status', params.status);
    if (params.from_date) queryParams.set('from_date', params.from_date);
    if (params.to_date) queryParams.set('to_date', params.to_date);
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.limit) queryParams.set('limit', params.limit.toString());

    return api.get<{
      success: boolean;
      total: number;
      page: number;
      limit: number;
      consultations: Array<{
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
      }>;
    }>(`/lawyers/me/consultations?${queryParams.toString()}`);
  },

  // Set bulk availability (verified lawyer)
  setBulkAvailability: async (slots: Array<{
    day_of_week: string;
    start_time: string;
    end_time: string;
    is_active?: boolean;
  }>, replaceExisting = false) => {
    return api.put<{
      success: boolean;
      message: string;
      availability: AvailabilitySlot[];
    }>('/lawyers/me/availability/bulk', {
      slots,
      replace_existing: replaceExisting,
    });
  },

  // Set unavailability dates (verified lawyer)
  setUnavailability: async (dates: Array<{
    date: string;
    start_time?: string;
    end_time?: string;
    reason?: string;
  }>) => {
    return api.post<{
      success: boolean;
      message: string;
      unavailability: Array<{
        id: string;
        unavailable_date: string;
        start_time?: string;
        end_time?: string;
        reason?: string;
      }>;
    }>('/lawyers/me/unavailability', {
      unavailable_dates: dates,
    });
  },
};
