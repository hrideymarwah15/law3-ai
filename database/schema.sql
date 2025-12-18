-- ============================================
-- Nyaay Saathi Database Schema v2.0
-- Production-Grade Schema for Legal Platform
-- Run this migration in Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- DROP EXISTING OBJECTS (for clean re-run)
-- ============================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS v_admin_dashboard_stats CASCADE;
DROP VIEW IF EXISTS v_verified_lawyers CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS otps CASCADE;
DROP TABLE IF EXISTS chatbot_interactions CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS consultations CASCADE;
DROP TABLE IF EXISTS lawyer_unavailability CASCADE;
DROP TABLE IF EXISTS lawyer_availability CASCADE;
DROP TABLE IF EXISTS lawyers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_consultation_reference() CASCADE;
DROP FUNCTION IF EXISTS generate_payment_reference() CASCADE;
DROP FUNCTION IF EXISTS update_lawyer_stats_on_review() CASCADE;
DROP FUNCTION IF EXISTS update_lawyer_consultation_stats() CASCADE;
DROP FUNCTION IF EXISTS calculate_lawyer_profile_completion() CASCADE;
DROP FUNCTION IF EXISTS track_consultation_status_history() CASCADE;
DROP FUNCTION IF EXISTS increment_counter(TEXT, TEXT, UUID, INTEGER) CASCADE;

-- ============================================
-- CUSTOM TYPES (ENUMS)
-- ============================================

-- Drop existing types if recreating
DO $$ BEGIN
    DROP TYPE IF EXISTS user_role CASCADE;
    DROP TYPE IF EXISTS user_status CASCADE;
    DROP TYPE IF EXISTS verification_status CASCADE;
    DROP TYPE IF EXISTS consultation_status CASCADE;
    DROP TYPE IF EXISTS consultation_type CASCADE;
    DROP TYPE IF EXISTS payment_status CASCADE;
    DROP TYPE IF EXISTS case_status CASCADE;
    DROP TYPE IF EXISTS case_type CASCADE;
    DROP TYPE IF EXISTS reminder_type CASCADE;
    DROP TYPE IF EXISTS reminder_status CASCADE;
    DROP TYPE IF EXISTS day_of_week CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE TYPE user_role AS ENUM ('user', 'lawyer', 'admin', 'super_admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'deleted');
CREATE TYPE verification_status AS ENUM ('pending', 'under_review', 'verified', 'rejected', 'revoked');
CREATE TYPE consultation_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE consultation_type AS ENUM ('video', 'audio', 'in_person');
CREATE TYPE payment_status AS ENUM ('initiated', 'pending', 'processing', 'success', 'failed', 'refunded', 'partially_refunded', 'disputed');
CREATE TYPE case_status AS ENUM ('active', 'closed', 'pending', 'won', 'lost', 'settled', 'appealed', 'archived');
CREATE TYPE case_type AS ENUM ('civil', 'criminal', 'family', 'property', 'consumer', 'labour', 'tax', 'constitutional', 'corporate', 'intellectual_property', 'cyber', 'other');
CREATE TYPE reminder_type AS ENUM ('hearing', 'document_submission', 'payment', 'meeting', 'consultation', 'follow_up', 'custom');
CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'failed', 'cancelled', 'acknowledged');
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- ============================================
-- USERS TABLE
-- Production-grade with proper constraints
-- ============================================

CREATE TABLE users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication (at least one required)
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(15) UNIQUE,
    
    -- Profile Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    display_name VARCHAR(200) GENERATED ALWAYS AS (
        CASE 
            WHEN last_name IS NOT NULL THEN first_name || ' ' || last_name
            ELSE first_name
        END
    ) STORED,
    avatar_url TEXT,
    date_of_birth DATE,
    gender VARCHAR(20),
    
    -- Role & Status
    role user_role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'active',
    
    -- Preferences
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true, "marketing": false}'::jsonb,
    
    -- Location
    address_line1 TEXT,
    address_line2 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(10),
    
    -- Verification Status
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    
    -- Account Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    banned_at TIMESTAMPTZ,
    banned_by UUID,
    ban_reason TEXT,
    ban_expires_at TIMESTAMPTZ,
    
    -- Soft Delete (GDPR Compliance)
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID,
    deletion_reason TEXT,
    deletion_scheduled_at TIMESTAMPTZ, -- For 30-day grace period
    
    -- Security
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Activity Tracking
    last_login_at TIMESTAMPTZ,
    last_login_ip VARCHAR(45),
    last_activity_at TIMESTAMPTZ,
    login_count INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT users_email_or_phone_required CHECK (
        email IS NOT NULL OR phone IS NOT NULL
    ),
    CONSTRAINT users_email_format CHECK (
        email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    ),
    CONSTRAINT users_phone_format CHECK (
        phone IS NULL OR phone ~ '^\+?[1-9]\d{9,14}$'
    ),
    CONSTRAINT users_pincode_format CHECK (
        pincode IS NULL OR pincode ~ '^\d{6}$'
    ),
    CONSTRAINT users_first_name_length CHECK (
        LENGTH(TRIM(first_name)) >= 2
    ),
    CONSTRAINT users_ban_reason_required CHECK (
        (is_banned = FALSE) OR (is_banned = TRUE AND ban_reason IS NOT NULL)
    )
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_city ON users(city) WHERE city IS NOT NULL;
CREATE INDEX idx_users_state ON users(state) WHERE state IS NOT NULL;
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_is_banned ON users(is_banned) WHERE is_banned = TRUE;
CREATE INDEX idx_users_is_deleted ON users(is_deleted) WHERE is_deleted = TRUE;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login_at) WHERE last_login_at IS NOT NULL;
CREATE INDEX idx_users_display_name_search ON users USING GIN(to_tsvector('english', display_name));

-- ============================================
-- LAWYERS TABLE
-- Comprehensive lawyer profile with all professional details
-- ============================================

CREATE TABLE lawyers (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign Key to Users
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Bar Council Registration (Required for verification)
    bar_council_number VARCHAR(100) NOT NULL,
    bar_council_state VARCHAR(100) NOT NULL,
    bar_council_enrollment_date DATE,
    bar_council_certificate_url TEXT,
    
    -- Professional Information
    license_number VARCHAR(100),
    specialization VARCHAR(100), -- Primary specialization
    specializations TEXT[] NOT NULL DEFAULT '{}', -- Multiple specializations
    experience_years INTEGER NOT NULL DEFAULT 0,
    bio TEXT,
    headline VARCHAR(200), -- Short tagline
    
    -- Education & Credentials (JSONB for flexibility)
    education JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: [{"degree": "LLB", "institution": "Delhi University", "year": 2015, "grade": "First Class"}]
    
    certifications JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"name": "ADR Certified", "issuer": "ICADR", "year": 2020, "valid_until": "2025-12-31"}]
    
    awards JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"title": "Best Criminal Lawyer", "organization": "Bar Council", "year": 2022}]
    
    -- Practice Details
    practice_areas TEXT[] NOT NULL DEFAULT '{}',
    courts_practiced TEXT[] NOT NULL DEFAULT '{}', -- e.g., ["Supreme Court", "Delhi High Court"]
    languages_spoken TEXT[] NOT NULL DEFAULT '{English}'::text[],
    
    -- Office Location (can differ from user's home location)
    office_name VARCHAR(200),
    office_address TEXT,
    office_city VARCHAR(100),
    office_state VARCHAR(100),
    office_pincode VARCHAR(10),
    office_landmark TEXT,
    office_latitude DECIMAL(10, 8),
    office_longitude DECIMAL(11, 8),
    
    -- Contact (office-specific)
    office_phone VARCHAR(15),
    office_email VARCHAR(255),
    website_url TEXT,
    linkedin_url TEXT,
    
    -- Consultation Settings
    consultation_fee INTEGER NOT NULL DEFAULT 0, -- In paisa (₹500 = 50000)
    followup_fee INTEGER DEFAULT 0, -- Discounted follow-up rate
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    consultation_duration INTEGER NOT NULL DEFAULT 30, -- Minutes
    buffer_time INTEGER NOT NULL DEFAULT 10, -- Minutes between consultations
    advance_booking_days INTEGER NOT NULL DEFAULT 30, -- How far ahead can book
    cancellation_hours INTEGER NOT NULL DEFAULT 24, -- Minimum hours before cancellation
    accepts_video BOOLEAN NOT NULL DEFAULT TRUE,
    accepts_audio BOOLEAN NOT NULL DEFAULT TRUE,
    accepts_chat BOOLEAN NOT NULL DEFAULT FALSE,
    accepts_in_person BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Verification & Compliance
    verification_status verification_status NOT NULL DEFAULT 'pending',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    verification_notes TEXT, -- Internal notes
    rejection_reason TEXT,
    rejected_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES users(id),
    
    -- Documents (for verification)
    id_proof_type VARCHAR(50), -- e.g., "Aadhaar", "PAN", "Passport"
    id_proof_number VARCHAR(50),
    id_proof_url TEXT,
    address_proof_url TEXT,
    profile_photo_url TEXT,
    additional_documents JSONB DEFAULT '[]'::jsonb,
    
    -- Ratings & Statistics
    rating DECIMAL(3, 2) NOT NULL DEFAULT 0.00, -- 0.00 to 5.00
    total_reviews INTEGER NOT NULL DEFAULT 0,
    total_consultations INTEGER NOT NULL DEFAULT 0,
    completed_consultations INTEGER NOT NULL DEFAULT 0,
    cancelled_consultations INTEGER NOT NULL DEFAULT 0,
    response_rate DECIMAL(5, 2) DEFAULT 0.00, -- Percentage
    avg_response_time_minutes INTEGER DEFAULT 0,
    
    -- Availability
    is_available BOOLEAN NOT NULL DEFAULT FALSE, -- Must be explicitly enabled
    is_accepting_new_clients BOOLEAN NOT NULL DEFAULT TRUE,
    max_daily_consultations INTEGER DEFAULT 10,
    
    -- Featured/Promoted
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    featured_until TIMESTAMPTZ,
    featured_order INTEGER,
    
    -- Internal Flags
    is_profile_complete BOOLEAN NOT NULL DEFAULT FALSE,
    profile_completion_percentage INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT lawyers_bar_council_unique UNIQUE (bar_council_number, bar_council_state),
    CONSTRAINT lawyers_experience_positive CHECK (experience_years >= 0 AND experience_years <= 70),
    CONSTRAINT lawyers_rating_range CHECK (rating >= 0.00 AND rating <= 5.00),
    CONSTRAINT lawyers_fee_positive CHECK (consultation_fee >= 0),
    CONSTRAINT lawyers_duration_valid CHECK (consultation_duration >= 15 AND consultation_duration <= 180),
    CONSTRAINT lawyers_pincode_format CHECK (
        office_pincode IS NULL OR office_pincode ~ '^\d{6}$'
    ),
    CONSTRAINT lawyers_rejection_reason_required CHECK (
        verification_status != 'rejected' OR rejection_reason IS NOT NULL
    ),
    CONSTRAINT lawyers_verified_consistency CHECK (
        (is_verified = TRUE AND verification_status = 'verified') OR
        (is_verified = FALSE AND verification_status != 'verified')
    )
);

-- Indexes for lawyers
CREATE INDEX idx_lawyers_user_id ON lawyers(user_id);
CREATE INDEX idx_lawyers_bar_council ON lawyers(bar_council_number, bar_council_state);
CREATE INDEX idx_lawyers_verification_status ON lawyers(verification_status);
CREATE INDEX idx_lawyers_is_verified ON lawyers(is_verified) WHERE is_verified = TRUE;
CREATE INDEX idx_lawyers_is_available ON lawyers(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_lawyers_specialization ON lawyers(specialization) WHERE specialization IS NOT NULL;
CREATE INDEX idx_lawyers_specializations ON lawyers USING GIN(specializations);
CREATE INDEX idx_lawyers_practice_areas ON lawyers USING GIN(practice_areas);
CREATE INDEX idx_lawyers_courts ON lawyers USING GIN(courts_practiced);
CREATE INDEX idx_lawyers_languages ON lawyers USING GIN(languages_spoken);
CREATE INDEX idx_lawyers_office_city ON lawyers(office_city) WHERE office_city IS NOT NULL;
CREATE INDEX idx_lawyers_office_state ON lawyers(office_state) WHERE office_state IS NOT NULL;
CREATE INDEX idx_lawyers_rating ON lawyers(rating DESC) WHERE is_verified = TRUE;
CREATE INDEX idx_lawyers_consultation_fee ON lawyers(consultation_fee) WHERE is_verified = TRUE;
CREATE INDEX idx_lawyers_experience ON lawyers(experience_years DESC) WHERE is_verified = TRUE;
CREATE INDEX idx_lawyers_is_featured ON lawyers(featured_order) WHERE is_featured = TRUE;
CREATE INDEX idx_lawyers_bio_search ON lawyers USING GIN(to_tsvector('english', COALESCE(bio, '') || ' ' || COALESCE(headline, '')));
CREATE INDEX idx_lawyers_created_at ON lawyers(created_at);

-- Geospatial index for location-based search
CREATE INDEX idx_lawyers_location ON lawyers(office_latitude, office_longitude) 
    WHERE office_latitude IS NOT NULL AND office_longitude IS NOT NULL;

-- ============================================
-- LAWYER AVAILABILITY TABLE
-- Weekly recurring schedule
-- ============================================

CREATE TABLE lawyer_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    
    -- Schedule
    day_of_week day_of_week NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Settings
    slot_duration INTEGER NOT NULL DEFAULT 30, -- Minutes
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT lawyer_availability_unique UNIQUE (lawyer_id, day_of_week, start_time),
    CONSTRAINT lawyer_availability_time_order CHECK (start_time < end_time),
    CONSTRAINT lawyer_availability_slot_duration CHECK (slot_duration >= 15 AND slot_duration <= 120)
);

CREATE INDEX idx_lawyer_availability_lawyer ON lawyer_availability(lawyer_id);
CREATE INDEX idx_lawyer_availability_day ON lawyer_availability(day_of_week);
CREATE INDEX idx_lawyer_availability_active ON lawyer_availability(lawyer_id, day_of_week) WHERE is_active = TRUE;

-- ============================================
-- LAWYER UNAVAILABILITY TABLE
-- Specific dates/times when lawyer is unavailable (holidays, vacations, etc.)
-- ============================================

CREATE TABLE lawyer_unavailability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    
    -- Unavailable Period
    unavailable_date DATE NOT NULL,
    start_time TIME, -- NULL means entire day
    end_time TIME,
    
    -- Reason
    reason VARCHAR(200),
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT lawyer_unavailability_unique UNIQUE (lawyer_id, unavailable_date, start_time),
    CONSTRAINT lawyer_unavailability_time_order CHECK (
        (start_time IS NULL AND end_time IS NULL) OR
        (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
    )
);

CREATE INDEX idx_lawyer_unavailability_lawyer ON lawyer_unavailability(lawyer_id);
CREATE INDEX idx_lawyer_unavailability_date ON lawyer_unavailability(unavailable_date);
CREATE INDEX idx_lawyer_unavailability_range ON lawyer_unavailability(lawyer_id, unavailable_date);

-- ============================================
-- CONSULTATIONS TABLE
-- Complete consultation booking and tracking
-- ============================================

CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference Number (human-readable)
    reference_number VARCHAR(20) NOT NULL UNIQUE,
    
    -- Parties
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    
    -- Scheduling
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30, -- Minutes
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    
    -- Type
    consultation_type consultation_type NOT NULL DEFAULT 'video',
    
    -- Status Tracking
    status consultation_status NOT NULL DEFAULT 'pending',
    status_history JSONB DEFAULT '[]'::jsonb,
    
    -- Payment
    amount INTEGER NOT NULL, -- In paisa
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    
    -- Meeting Details
    meeting_link TEXT,
    meeting_id VARCHAR(100),
    meeting_password VARCHAR(50),
    meeting_provider VARCHAR(50) DEFAULT 'jitsi', -- jitsi, zoom, google_meet
    
    -- User's Problem Description
    problem_category VARCHAR(100),
    problem_description TEXT,
    documents_shared JSONB DEFAULT '[]'::jsonb,
    
    -- Notes
    user_notes TEXT, -- Notes by user before consultation
    lawyer_notes TEXT, -- Private notes by lawyer
    consultation_summary TEXT, -- Summary after consultation
    recommendations TEXT, -- Lawyer's recommendations
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_notes TEXT,
    
    -- Actual Timing
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    actual_duration INTEGER, -- Actual minutes spent
    
    -- Confirmation
    confirmed_at TIMESTAMPTZ,
    confirmed_by UUID REFERENCES users(id),
    
    -- Cancellation
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    cancellation_type VARCHAR(50), -- 'user', 'lawyer', 'system', 'payment_failed'
    
    -- Rescheduling
    rescheduled_from UUID REFERENCES consultations(id),
    reschedule_count INTEGER NOT NULL DEFAULT 0,
    
    -- Completion
    completed_at TIMESTAMPTZ,
    
    -- Ratings (cached from reviews)
    user_rating INTEGER,
    lawyer_rating INTEGER,
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'web', -- web, mobile_app, api
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT consultations_time_order CHECK (scheduled_start < scheduled_end),
    CONSTRAINT consultations_amount_positive CHECK (amount >= 0),
    CONSTRAINT consultations_duration_valid CHECK (duration >= 15 AND duration <= 180),
    CONSTRAINT consultations_rating_range CHECK (
        (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5)) AND
        (lawyer_rating IS NULL OR (lawyer_rating >= 1 AND lawyer_rating <= 5))
    ),
    CONSTRAINT consultations_cancellation_reason_required CHECK (
        status != 'cancelled' OR cancellation_reason IS NOT NULL
    )
);

-- Indexes for consultations
CREATE INDEX idx_consultations_reference ON consultations(reference_number);
CREATE INDEX idx_consultations_user ON consultations(user_id);
CREATE INDEX idx_consultations_lawyer ON consultations(lawyer_id);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_booking_date ON consultations(booking_date);
CREATE INDEX idx_consultations_scheduled_start ON consultations(scheduled_start);
CREATE INDEX idx_consultations_payment_status ON consultations(payment_status);
CREATE INDEX idx_consultations_is_paid ON consultations(is_paid) WHERE is_paid = FALSE;
CREATE INDEX idx_consultations_user_upcoming ON consultations(user_id, scheduled_start) 
    WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_consultations_lawyer_upcoming ON consultations(lawyer_id, scheduled_start) 
    WHERE status IN ('pending', 'confirmed');
CREATE INDEX idx_consultations_created_at ON consultations(created_at);

-- Prevent double booking
CREATE UNIQUE INDEX idx_consultations_no_double_booking ON consultations(lawyer_id, scheduled_start) 
    WHERE status NOT IN ('cancelled', 'no_show');

-- ============================================
-- PAYMENTS TABLE
-- Complete payment tracking with Razorpay integration
-- ============================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Reference
    payment_reference VARCHAR(50) NOT NULL UNIQUE,
    
    -- Relations
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    
    -- Amount Details
    amount INTEGER NOT NULL, -- In paisa
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    gst_amount INTEGER DEFAULT 0,
    platform_fee INTEGER DEFAULT 0,
    lawyer_payout INTEGER NOT NULL, -- Amount after deductions
    
    -- Status
    status payment_status NOT NULL DEFAULT 'initiated',
    status_history JSONB DEFAULT '[]'::jsonb,
    
    -- Razorpay Details
    razorpay_order_id VARCHAR(100) UNIQUE,
    razorpay_payment_id VARCHAR(100) UNIQUE,
    razorpay_signature TEXT,
    razorpay_invoice_id VARCHAR(100),
    
    -- Payment Method
    payment_method VARCHAR(50), -- upi, card, netbanking, wallet
    payment_method_details JSONB DEFAULT '{}'::jsonb,
    
    -- Bank/Card Details (masked)
    bank_name VARCHAR(100),
    card_last4 VARCHAR(4),
    card_network VARCHAR(20), -- visa, mastercard, rupay
    upi_vpa VARCHAR(100),
    
    -- Timestamps
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Failure Details
    failure_reason TEXT,
    failure_code VARCHAR(50),
    
    -- Refund Details
    is_refunded BOOLEAN NOT NULL DEFAULT FALSE,
    refund_amount INTEGER,
    refund_id VARCHAR(100),
    refund_status VARCHAR(50),
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    refunded_by UUID REFERENCES users(id),
    
    -- Payout to Lawyer
    payout_status VARCHAR(50) DEFAULT 'pending',
    payout_id VARCHAR(100),
    payout_processed_at TIMESTAMPTZ,
    
    -- Error Details
    error_code VARCHAR(50),
    error_description TEXT,
    error_source VARCHAR(50),
    error_step VARCHAR(50),
    error_reason VARCHAR(100),
    
    -- Receipt
    receipt_url TEXT,
    invoice_url TEXT,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT payments_amount_positive CHECK (amount > 0),
    CONSTRAINT payments_lawyer_payout_valid CHECK (lawyer_payout >= 0 AND lawyer_payout <= amount),
    CONSTRAINT payments_refund_valid CHECK (
        (is_refunded = FALSE) OR 
        (is_refunded = TRUE AND refund_amount IS NOT NULL AND refund_amount <= amount)
    )
);

-- Indexes for payments
CREATE INDEX idx_payments_reference ON payments(payment_reference);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_consultation ON payments(consultation_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_razorpay_order ON payments(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE INDEX idx_payments_razorpay_payment ON payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE INDEX idx_payments_payout_status ON payments(payout_status) WHERE payout_status = 'pending';
CREATE INDEX idx_payments_created_at ON payments(created_at);

-- ============================================
-- REVIEWS TABLE
-- User reviews for completed consultations
-- ============================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relations
    consultation_id UUID NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    
    -- Rating
    rating INTEGER NOT NULL,
    
    -- Detailed Ratings (optional)
    communication_rating INTEGER,
    knowledge_rating INTEGER,
    professionalism_rating INTEGER,
    value_rating INTEGER,
    
    -- Review Content
    title VARCHAR(200),
    review_text TEXT,
    
    -- Response from Lawyer
    lawyer_response TEXT,
    lawyer_responded_at TIMESTAMPTZ,
    
    -- Moderation
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT TRUE, -- Verified purchase
    is_approved BOOLEAN NOT NULL DEFAULT TRUE, -- Moderation status
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_reason TEXT,
    
    -- Helpfulness
    helpful_count INTEGER NOT NULL DEFAULT 0,
    not_helpful_count INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT reviews_rating_range CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT reviews_detailed_ratings CHECK (
        (communication_rating IS NULL OR (communication_rating >= 1 AND communication_rating <= 5)) AND
        (knowledge_rating IS NULL OR (knowledge_rating >= 1 AND knowledge_rating <= 5)) AND
        (professionalism_rating IS NULL OR (professionalism_rating >= 1 AND professionalism_rating <= 5)) AND
        (value_rating IS NULL OR (value_rating >= 1 AND value_rating <= 5))
    )
);

-- Indexes for reviews
CREATE INDEX idx_reviews_consultation ON reviews(consultation_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_lawyer ON reviews(lawyer_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_reviews_lawyer_rating ON reviews(lawyer_id, rating) WHERE is_approved = TRUE AND is_hidden = FALSE;
CREATE INDEX idx_reviews_is_featured ON reviews(lawyer_id) WHERE is_featured = TRUE;
CREATE INDEX idx_reviews_created_at ON reviews(created_at);

-- ============================================
-- CASES TABLE
-- User's legal cases for tracking
-- ============================================

CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Owner
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Case Information
    case_title VARCHAR(255) NOT NULL,
    case_number VARCHAR(100),
    filing_number VARCHAR(100),
    filing_date DATE,
    
    -- Court Details
    court_name VARCHAR(255),
    court_type VARCHAR(100), -- Supreme Court, High Court, District Court, etc.
    court_location VARCHAR(255),
    judge_name VARCHAR(255),
    
    -- Case Details
    case_type case_type NOT NULL DEFAULT 'other',
    status case_status NOT NULL DEFAULT 'active',
    case_description TEXT,
    
    -- Parties
    petitioner_name VARCHAR(255),
    respondent_name VARCHAR(255),
    petitioner_advocate VARCHAR(255),
    respondent_advocate VARCHAR(255),
    
    -- Our Lawyer (if using platform)
    lawyer_id UUID REFERENCES lawyers(id) ON DELETE SET NULL,
    lawyer_name VARCHAR(255), -- For external lawyers
    lawyer_contact VARCHAR(100),
    
    -- Important Dates
    next_hearing_date TIMESTAMPTZ,
    last_hearing_date TIMESTAMPTZ,
    disposal_date TIMESTAMPTZ,
    
    -- Documents
    documents JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"name": "FIR Copy", "url": "...", "uploaded_at": "..."}]
    
    -- Notes
    notes TEXT,
    private_notes TEXT, -- Not shared with lawyer
    
    -- Outcome (when closed)
    outcome TEXT,
    outcome_details TEXT,
    
    -- Archival
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for cases
CREATE INDEX idx_cases_user ON cases(user_id);
CREATE INDEX idx_cases_lawyer ON cases(lawyer_id) WHERE lawyer_id IS NOT NULL;
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_case_type ON cases(case_type);
CREATE INDEX idx_cases_next_hearing ON cases(next_hearing_date) WHERE next_hearing_date IS NOT NULL;
CREATE INDEX idx_cases_case_number ON cases(case_number) WHERE case_number IS NOT NULL;
CREATE INDEX idx_cases_is_archived ON cases(user_id, is_archived) WHERE is_archived = FALSE;
CREATE INDEX idx_cases_created_at ON cases(created_at);

-- ============================================
-- REMINDERS TABLE
-- Reminders for hearings, deadlines, etc.
-- ============================================

CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Owner
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Related Entities (optional)
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
    
    -- Reminder Details
    reminder_type reminder_type NOT NULL DEFAULT 'custom',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Scheduling
    reminder_datetime TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    
    -- Recurrence (optional)
    is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_pattern VARCHAR(50), -- daily, weekly, monthly
    recurrence_end_date DATE,
    
    -- Notification Channels
    notify_email BOOLEAN NOT NULL DEFAULT TRUE,
    notify_sms BOOLEAN NOT NULL DEFAULT FALSE,
    notify_push BOOLEAN NOT NULL DEFAULT TRUE,
    notify_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Advance Notification (minutes before)
    advance_notification_1 INTEGER DEFAULT 1440, -- 24 hours
    advance_notification_2 INTEGER DEFAULT 60, -- 1 hour
    advance_notification_3 INTEGER, -- Optional third notification
    
    -- Status
    status reminder_status NOT NULL DEFAULT 'pending',
    
    -- Delivery Tracking
    email_sent_at TIMESTAMPTZ,
    sms_sent_at TIMESTAMPTZ,
    push_sent_at TIMESTAMPTZ,
    
    -- Acknowledgment
    acknowledged_at TIMESTAMPTZ,
    snoozed_until TIMESTAMPTZ,
    snooze_count INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT reminders_future_datetime CHECK (
        reminder_datetime > created_at
    ),
    CONSTRAINT reminders_advance_notification_valid CHECK (
        advance_notification_1 IS NULL OR advance_notification_1 > 0
    )
);

-- Indexes for reminders
CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_case ON reminders(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX idx_reminders_consultation ON reminders(consultation_id) WHERE consultation_id IS NOT NULL;
CREATE INDEX idx_reminders_datetime ON reminders(reminder_datetime);
CREATE INDEX idx_reminders_status ON reminders(status);
CREATE INDEX idx_reminders_pending ON reminders(reminder_datetime) WHERE status = 'pending';
CREATE INDEX idx_reminders_type ON reminders(reminder_type);
CREATE INDEX idx_reminders_created_at ON reminders(created_at);

-- ============================================
-- CHATBOT INTERACTIONS TABLE
-- AI chatbot conversation history
-- ============================================

CREATE TABLE chatbot_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User (optional for anonymous)
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Session
    session_id VARCHAR(100) NOT NULL,
    conversation_id VARCHAR(100), -- Groups related messages
    
    -- Message
    message_type VARCHAR(20) NOT NULL DEFAULT 'text', -- text, voice, image
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    
    -- AI Details
    model VARCHAR(100) DEFAULT 'gemini-2.0-flash',
    tokens_used INTEGER,
    response_time_ms INTEGER,
    
    -- Context
    language VARCHAR(20) NOT NULL DEFAULT 'english',
    detected_intent VARCHAR(100),
    detected_entities JSONB DEFAULT '[]'::jsonb,
    confidence_score DECIMAL(5, 4),
    
    -- Feedback
    is_helpful BOOLEAN,
    feedback_text TEXT,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    source VARCHAR(50) DEFAULT 'web',
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chatbot_interactions
CREATE INDEX idx_chatbot_user ON chatbot_interactions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_chatbot_session ON chatbot_interactions(session_id);
CREATE INDEX idx_chatbot_conversation ON chatbot_interactions(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX idx_chatbot_language ON chatbot_interactions(language);
CREATE INDEX idx_chatbot_intent ON chatbot_interactions(detected_intent) WHERE detected_intent IS NOT NULL;
CREATE INDEX idx_chatbot_created_at ON chatbot_interactions(created_at);

-- ============================================
-- OTP TABLE
-- One-time passwords for authentication
-- ============================================

CREATE TABLE otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identifier
    identifier VARCHAR(255) NOT NULL, -- phone or email
    identifier_type VARCHAR(10) NOT NULL, -- 'phone' or 'email'
    
    -- OTP
    otp_hash VARCHAR(255) NOT NULL, -- Hashed OTP
    
    -- Purpose
    purpose VARCHAR(50) NOT NULL DEFAULT 'login', -- login, register, reset_password, verify_phone, verify_email
    
    -- Validity
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Usage
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    
    -- Security
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_until TIMESTAMPTZ,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT otps_identifier_type_valid CHECK (identifier_type IN ('phone', 'email')),
    CONSTRAINT otps_max_attempts_valid CHECK (max_attempts > 0 AND max_attempts <= 10)
);

-- Indexes for OTPs
CREATE INDEX idx_otps_identifier ON otps(identifier, identifier_type);
CREATE INDEX idx_otps_expires ON otps(expires_at);
CREATE INDEX idx_otps_lookup ON otps(identifier, purpose, is_used) WHERE is_used = FALSE;

-- Clean up expired OTPs automatically (can be done via cron)
CREATE INDEX idx_otps_cleanup ON otps(expires_at) WHERE is_used = FALSE;

-- ============================================
-- AUDIT LOGS TABLE
-- Comprehensive audit trail
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Actor
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type VARCHAR(50) NOT NULL DEFAULT 'user', -- user, admin, system, api
    
    -- Action
    action VARCHAR(100) NOT NULL,
    action_category VARCHAR(50), -- auth, profile, consultation, payment, admin
    
    -- Target Entity
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_id VARCHAR(100),
    
    -- Location (from IP)
    geo_country VARCHAR(100),
    geo_city VARCHAR(100),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'success', -- success, failure, error
    error_message TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_user ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_action_category ON audit_logs(action_category) WHERE action_category IS NOT NULL;
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_status ON audit_logs(status) WHERE status != 'success';

-- Partition by month for performance (optional, implement if needed)
-- CREATE INDEX idx_audit_partition ON audit_logs(created_at);

-- ============================================
-- NOTIFICATIONS TABLE
-- User notifications
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Recipient
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- consultation, payment, reminder, promotion, system
    
    -- Related Entity
    entity_type VARCHAR(50),
    entity_id UUID,
    action_url TEXT,
    
    -- Delivery
    channels TEXT[] NOT NULL DEFAULT '{push}'::text[], -- push, email, sms
    
    -- Status
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    
    -- Delivery Status
    push_sent BOOLEAN DEFAULT FALSE,
    push_sent_at TIMESTAMPTZ,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(notification_type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate consultation reference number
CREATE OR REPLACE FUNCTION generate_consultation_reference()
RETURNS TRIGGER AS $$
DECLARE
    ref_number VARCHAR(20);
BEGIN
    ref_number := 'NS' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                  LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    NEW.reference_number := ref_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate payment reference number
CREATE OR REPLACE FUNCTION generate_payment_reference()
RETURNS TRIGGER AS $$
DECLARE
    ref_number VARCHAR(50);
BEGIN
    ref_number := 'PAY' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                  LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    NEW.payment_reference := ref_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update lawyer stats after review
CREATE OR REPLACE FUNCTION update_lawyer_stats_on_review()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE lawyers
    SET 
        rating = (
            SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0.00)
            FROM reviews
            WHERE lawyer_id = NEW.lawyer_id
            AND is_approved = TRUE
            AND is_hidden = FALSE
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE lawyer_id = NEW.lawyer_id
            AND is_approved = TRUE
            AND is_hidden = FALSE
        ),
        updated_at = NOW()
    WHERE id = NEW.lawyer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Update lawyer consultation stats
CREATE OR REPLACE FUNCTION update_lawyer_consultation_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE lawyers
        SET 
            total_consultations = total_consultations + 1,
            completed_consultations = completed_consultations + 1,
            updated_at = NOW()
        WHERE id = NEW.lawyer_id;
    ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        UPDATE lawyers
        SET 
            cancelled_consultations = cancelled_consultations + 1,
            updated_at = NOW()
        WHERE id = NEW.lawyer_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate lawyer profile completion
CREATE OR REPLACE FUNCTION calculate_lawyer_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
    completion INTEGER := 0;
    total_fields INTEGER := 20;
    filled_fields INTEGER := 0;
BEGIN
    -- Check each important field
    IF NEW.bar_council_number IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.bar_council_state IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.specialization IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF array_length(NEW.specializations, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.experience_years > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.bio IS NOT NULL AND LENGTH(NEW.bio) > 50 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.education::text != '[]' THEN filled_fields := filled_fields + 1; END IF;
    IF array_length(NEW.practice_areas, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF array_length(NEW.courts_practiced, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF array_length(NEW.languages_spoken, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.office_city IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.office_state IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.office_address IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.consultation_fee > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.bar_council_certificate_url IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.id_proof_url IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.profile_photo_url IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.headline IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.office_phone IS NOT NULL OR NEW.office_email IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.consultation_duration > 0 THEN filled_fields := filled_fields + 1; END IF;
    
    completion := (filled_fields * 100) / total_fields;
    NEW.profile_completion_percentage := completion;
    NEW.is_profile_complete := (completion >= 80);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Track consultation status history
CREATE OR REPLACE FUNCTION track_consultation_status_history()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_history := NEW.status_history || jsonb_build_object(
            'from', OLD.status,
            'to', NEW.status,
            'changed_at', NOW(),
            'changed_by', COALESCE(NEW.cancelled_by, NEW.confirmed_by)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment function for counters
CREATE OR REPLACE FUNCTION increment_counter(
    p_table_name TEXT,
    p_column_name TEXT,
    p_row_id UUID,
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
    EXECUTE format(
        'UPDATE %I SET %I = %I + $1, updated_at = NOW() WHERE id = $2',
        p_table_name, p_column_name, p_column_name
    ) USING p_increment, p_row_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGERS
-- ============================================

-- Updated_at triggers
CREATE TRIGGER trigger_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_lawyers_updated_at 
    BEFORE UPDATE ON lawyers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_lawyer_availability_updated_at 
    BEFORE UPDATE ON lawyer_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_consultations_updated_at 
    BEFORE UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_payments_updated_at 
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_reviews_updated_at 
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_cases_updated_at 
    BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_reminders_updated_at 
    BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reference number generation
CREATE TRIGGER trigger_consultation_reference
    BEFORE INSERT ON consultations
    FOR EACH ROW EXECUTE FUNCTION generate_consultation_reference();

CREATE TRIGGER trigger_payment_reference
    BEFORE INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION generate_payment_reference();

-- Lawyer stats updates
CREATE TRIGGER trigger_update_lawyer_stats_on_review
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_lawyer_stats_on_review();

CREATE TRIGGER trigger_update_lawyer_consultation_stats
    AFTER UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION update_lawyer_consultation_stats();

-- Profile completion calculation
CREATE TRIGGER trigger_calculate_lawyer_profile_completion
    BEFORE INSERT OR UPDATE ON lawyers
    FOR EACH ROW EXECUTE FUNCTION calculate_lawyer_profile_completion();

-- Consultation status history
CREATE TRIGGER trigger_consultation_status_history
    BEFORE UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION track_consultation_status_history();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies (for backend API)
CREATE POLICY "service_role_all_users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_lawyers" ON lawyers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_availability" ON lawyer_availability FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_unavailability" ON lawyer_unavailability FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_consultations" ON consultations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_payments" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_reviews" ON reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_cases" ON cases FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_reminders" ON reminders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_chatbot" ON chatbot_interactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_notifications" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_audit" ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_otps" ON otps FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read policies for verified lawyers
CREATE POLICY "public_read_verified_lawyers" ON lawyers
    FOR SELECT TO anon, authenticated 
    USING (is_verified = true AND verification_status = 'verified');

-- Public read for reviews
CREATE POLICY "public_read_approved_reviews" ON reviews
    FOR SELECT TO anon, authenticated 
    USING (is_approved = true AND is_hidden = false);

-- Public read for lawyer availability
CREATE POLICY "public_read_lawyer_availability" ON lawyer_availability
    FOR SELECT TO anon, authenticated 
    USING (
        is_active = true AND 
        EXISTS (
            SELECT 1 FROM lawyers 
            WHERE lawyers.id = lawyer_availability.lawyer_id 
            AND lawyers.is_verified = true
        )
    );

-- ============================================
-- VIEWS (Useful aggregations)
-- ============================================

-- View: Verified lawyers with user info
CREATE OR REPLACE VIEW v_verified_lawyers AS
SELECT 
    l.id,
    l.user_id,
    u.first_name,
    u.last_name,
    u.display_name,
    u.avatar_url,
    l.bar_council_number,
    l.bar_council_state,
    l.specialization,
    l.specializations,
    l.experience_years,
    l.bio,
    l.headline,
    l.office_city,
    l.office_state,
    l.consultation_fee,
    l.rating,
    l.total_reviews,
    l.total_consultations,
    l.is_available,
    l.is_featured,
    l.profile_photo_url,
    l.accepts_video,
    l.accepts_audio,
    l.accepts_chat,
    l.accepts_in_person,
    l.languages_spoken,
    l.practice_areas,
    l.courts_practiced,
    l.created_at
FROM lawyers l
JOIN users u ON l.user_id = u.id
WHERE l.is_verified = true 
AND l.verification_status = 'verified'
AND u.status = 'active'
AND u.is_deleted = false;

-- View: Dashboard stats for admin
CREATE OR REPLACE VIEW v_admin_dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM users WHERE is_deleted = false) as total_users,
    (SELECT COUNT(*) FROM users WHERE role = 'lawyer' AND is_deleted = false) as total_lawyers,
    (SELECT COUNT(*) FROM lawyers WHERE is_verified = true) as verified_lawyers,
    (SELECT COUNT(*) FROM lawyers WHERE verification_status = 'pending') as pending_verifications,
    (SELECT COUNT(*) FROM consultations WHERE status = 'completed') as completed_consultations,
    (SELECT COUNT(*) FROM consultations WHERE status = 'pending') as pending_consultations,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'success') as total_revenue,
    (SELECT COUNT(*) FROM reviews) as total_reviews,
    (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE is_approved = true) as avg_rating;

-- ============================================
-- SEED DATA (Optional - Remove in production)
-- ============================================

-- You can add seed data here for development/testing

-- ============================================
-- GRANTS & PERMISSIONS
-- ============================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

COMMIT;
