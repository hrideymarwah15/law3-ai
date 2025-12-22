/**
 * TypeScript Type Definitions for Nyaay Saathi
 * Core domain types for the legal consultation platform
 */

// ============================================
// Common Types
// ============================================

export type Role = "user" | "lawyer" | "admin";
export type Gender = "male" | "female" | "other" | "prefer_not_to_say";
export type Language = "en" | "hi";

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  role: Role;
  isVerified: boolean;
  isActive: boolean;
  preferredLanguage: Language;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country: string;
  };
  dateOfBirth?: string;
  gender?: Gender;
}

// ============================================
// Lawyer Types
// ============================================

export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";

export interface PracticeArea {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface LawyerProfile {
  id: string;
  userId: string;
  user: User;
  barCouncilId: string;
  barCouncilState: string;
  enrollmentYear: number;
  yearsOfExperience: number;
  practiceAreas: PracticeArea[];
  courts: string[];
  languages: string[];
  bio: string;
  education: LawyerEducation[];
  experience: LawyerExperience[];
  awards?: LawyerAward[];
  
  // Pricing
  consultationFee: number;
  consultationDuration: number; // in minutes
  
  // Ratings
  rating: number;
  totalReviews: number;
  totalConsultations: number;
  
  // Verification
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  
  // Availability
  isAvailable: boolean;
  availabilitySchedule?: AvailabilitySchedule[];
  
  createdAt: string;
  updatedAt: string;
}

export interface LawyerEducation {
  id: string;
  degree: string;
  institution: string;
  year: number;
}

export interface LawyerExperience {
  id: string;
  title: string;
  organization: string;
  startYear: number;
  endYear?: number;
  current: boolean;
  description?: string;
}

export interface LawyerAward {
  id: string;
  title: string;
  organization: string;
  year: number;
}

export interface AvailabilitySchedule {
  dayOfWeek: number; // 0-6, Sunday to Saturday
  slots: TimeSlot[];
}

export interface TimeSlot {
  startTime: string; // HH:mm format
  endTime: string;
  isAvailable: boolean;
}

export interface LawyerSearchFilters {
  practiceArea?: string;
  location?: string;
  language?: string;
  minExperience?: number;
  maxFee?: number;
  minRating?: number;
  availability?: "today" | "this_week" | "any";
  sortBy?: "rating" | "experience" | "fee_low" | "fee_high" | "reviews";
}

// ============================================
// Consultation Types
// ============================================

export type ConsultationType = "video" | "audio" | "chat" | "in_person";
export type ConsultationStatus = 
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export interface Consultation {
  id: string;
  userId: string;
  user: User;
  lawyerId: string;
  lawyer: LawyerProfile;
  
  type: ConsultationType;
  status: ConsultationStatus;
  
  scheduledAt: string;
  duration: number; // in minutes
  startedAt?: string;
  endedAt?: string;
  
  caseTitle: string;
  caseDescription: string;
  practiceArea: PracticeArea;
  
  amount: number;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  
  notes?: string;
  lawyerNotes?: string;
  
  meetingLink?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationSlot {
  date: string;
  slots: {
    time: string;
    isAvailable: boolean;
    consultationId?: string;
  }[];
}

// ============================================
// Payment Types
// ============================================

export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded";
export type PaymentMethod = "razorpay" | "upi" | "card" | "netbanking" | "wallet";

export interface Payment {
  id: string;
  consultationId: string;
  userId: string;
  
  amount: number;
  currency: string;
  status: PaymentStatus;
  method?: PaymentMethod;
  
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  
  refundId?: string;
  refundAmount?: number;
  refundReason?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Chat Types
// ============================================

export type MessageType = "text" | "image" | "document" | "system";

export interface ChatRoom {
  id: string;
  consultationId: string;
  participants: string[];
  isActive: boolean;
  lastMessageAt?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  sender: User;
  
  type: MessageType;
  content: string;
  attachmentUrl?: string;
  
  isRead: boolean;
  readAt?: string;
  
  createdAt: string;
}

// ============================================
// Review Types
// ============================================

export interface Review {
  id: string;
  consultationId: string;
  userId: string;
  user: User;
  lawyerId: string;
  
  rating: number;
  title?: string;
  comment?: string;
  
  isAnonymous: boolean;
  isVerified: boolean;
  
  helpfulCount: number;
  
  lawyerResponse?: {
    content: string;
    respondedAt: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Notification Types
// ============================================

export type NotificationType = 
  | "consultation_booked"
  | "consultation_confirmed"
  | "consultation_reminder"
  | "consultation_started"
  | "consultation_completed"
  | "consultation_cancelled"
  | "payment_success"
  | "payment_failed"
  | "new_message"
  | "new_review"
  | "verification_approved"
  | "verification_rejected"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// ============================================
// Document Types
// ============================================

export type DocumentType = 
  | "bar_certificate"
  | "degree_certificate"
  | "id_proof"
  | "address_proof"
  | "case_document"
  | "consultation_document"
  | "other";

export interface Document {
  id: string;
  userId: string;
  type: DocumentType;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  isVerified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
}

// ============================================
// AI Chatbot Types
// ============================================

export interface AIChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  suggestedPracticeAreas?: string[];
  suggestedLawyers?: string[];
  createdAt: string;
}

export interface AIChatSession {
  id: string;
  userId?: string;
  messages: AIChatMessage[];
  summary?: string;
  practiceAreasIdentified: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Form Types
// ============================================

export interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: "user" | "lawyer";
  acceptTerms: boolean;
}

export interface LawyerOnboardingFormData {
  barCouncilId: string;
  barCouncilState: string;
  enrollmentYear: number;
  practiceAreas: string[];
  courts: string[];
  languages: string[];
  bio: string;
  education: Omit<LawyerEducation, "id">[];
  experience: Omit<LawyerExperience, "id">[];
  consultationFee: number;
  consultationDuration: number;
}

export interface BookConsultationFormData {
  lawyerId: string;
  type: ConsultationType;
  date: string;
  time: string;
  caseTitle: string;
  caseDescription: string;
  practiceAreaId: string;
}

// ============================================
// Analytics Types
// ============================================

export interface DashboardStats {
  totalConsultations: number;
  completedConsultations: number;
  pendingConsultations: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  consultationsByStatus: Record<ConsultationStatus, number>;
  consultationsByType: Record<ConsultationType, number>;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface EarningsData {
  period: string;
  amount: number;
  consultations: number;
}
