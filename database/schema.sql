-- Nyaay Saathi Database Schema
-- Run this migration in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- CUSTOM TYPES (ENUMS)
-- ============================================

CREATE TYPE user_role AS ENUM ('user', 'lawyer', 'admin');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE consultation_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE case_status AS ENUM ('active', 'closed', 'pending', 'won', 'lost', 'settled');
CREATE TYPE case_type AS ENUM ('civil', 'criminal', 'family', 'property', 'consumer', 'labour', 'tax', 'constitutional', 'other');
CREATE TYPE reminder_type AS ENUM ('hearing', 'document_submission', 'payment', 'meeting', 'custom');
CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'cancelled');

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(15),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    preferred_language VARCHAR(10) DEFAULT 'en',
    language_preference VARCHAR(10) DEFAULT 'en',
    city VARCHAR(100),
    state VARCHAR(100),
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_city ON users(city);

-- ============================================
-- LAWYERS TABLE (Separate from users for lawyer-specific data)
-- ============================================

CREATE TABLE lawyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Professional Information
    bar_council_number VARCHAR(100),
    bar_council_state VARCHAR(100),
    specialization VARCHAR(100),
    specializations TEXT[] DEFAULT '{}',
    experience_years INTEGER DEFAULT 0,
    bio TEXT,
    
    -- Education & Credentials
    education JSONB DEFAULT '[]',
    certifications JSONB DEFAULT '[]',
    
    -- Location & Practice
    practice_areas TEXT[] DEFAULT '{}',
    courts_practiced TEXT[] DEFAULT '{}',
    languages_spoken TEXT[] DEFAULT '{}',
    office_address TEXT,
    office_city VARCHAR(100),
    office_state VARCHAR(100),
    office_pincode VARCHAR(10),
    
    -- Pricing
    consultation_fee INTEGER DEFAULT 0,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status verification_status DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Documents
    bar_certificate_url TEXT,
    id_proof_url TEXT,
    profile_photo_url TEXT,
    
    -- Stats
    rating DECIMAL(2, 1) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_consultations INTEGER DEFAULT 0,
    
    -- Availability
    is_available BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lawyers_user_id ON lawyers(user_id);
CREATE INDEX idx_lawyers_is_verified ON lawyers(is_verified);
CREATE INDEX idx_lawyers_verification_status ON lawyers(verification_status);
CREATE INDEX idx_lawyers_office_city ON lawyers(office_city);
CREATE INDEX idx_lawyers_specialization ON lawyers(specialization);
CREATE INDEX idx_lawyers_specializations ON lawyers USING GIN(specializations);
CREATE INDEX idx_lawyers_rating ON lawyers(rating DESC);
CREATE INDEX idx_lawyers_consultation_fee ON lawyers(consultation_fee);
CREATE INDEX idx_lawyers_bio_search ON lawyers USING GIN(to_tsvector('english', COALESCE(bio, '')));

-- ============================================
-- LAWYER AVAILABILITY TABLE
-- ============================================

CREATE TABLE lawyer_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    day_of_week VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(lawyer_id, day_of_week, start_time)
);

CREATE INDEX idx_lawyer_availability_lawyer ON lawyer_availability(lawyer_id);
CREATE INDEX idx_lawyer_availability_day ON lawyer_availability(day_of_week);

-- ============================================
-- CONSULTATIONS TABLE
-- ============================================

CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    
    -- Scheduling
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    scheduled_at TIMESTAMPTZ,
    duration INTEGER DEFAULT 30,
    
    -- Status
    status consultation_status DEFAULT 'pending',
    
    -- Payment
    amount INTEGER NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    
    -- Meeting
    meeting_link TEXT,
    meeting_type VARCHAR(50) DEFAULT 'video',
    
    -- Details
    problem_description TEXT,
    notes TEXT,
    user_notes TEXT,
    lawyer_notes TEXT,
    
    -- Cancellation
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    
    -- Completion
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consultations_user ON consultations(user_id);
CREATE INDEX idx_consultations_lawyer ON consultations(lawyer_id);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_booking_date ON consultations(booking_date);
CREATE INDEX idx_consultations_payment_status ON consultations(payment_status);

-- ============================================
-- PAYMENTS TABLE
-- ============================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'initiated',
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature TEXT,
    refund_amount INTEGER,
    refund_id VARCHAR(100),
    refund_status VARCHAR(50),
    refund_date TIMESTAMPTZ,
    payment_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_consultation ON payments(consultation_id);
CREATE INDEX idx_payments_order_id ON payments(razorpay_order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================
-- REVIEWS TABLE
-- ============================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lawyer_id UUID NOT NULL REFERENCES lawyers(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_lawyer ON reviews(lawyer_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- ============================================
-- CASES TABLE
-- ============================================

CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_title VARCHAR(255) NOT NULL,
    case_number VARCHAR(100),
    court_name VARCHAR(255),
    case_type case_type DEFAULT 'other',
    status case_status DEFAULT 'active',
    next_hearing_date TIMESTAMPTZ,
    lawyer_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cases_user ON cases(user_id);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_next_hearing ON cases(next_hearing_date);

-- ============================================
-- REMINDERS TABLE
-- ============================================

CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    reminder_type reminder_type DEFAULT 'custom',
    reminder_date TIMESTAMPTZ NOT NULL,
    message TEXT,
    send_sms BOOLEAN DEFAULT FALSE,
    status reminder_status DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_case ON reminders(case_id);
CREATE INDEX idx_reminders_date ON reminders(reminder_date);
CREATE INDEX idx_reminders_status ON reminders(status);

-- ============================================
-- CHATBOT INTERACTIONS TABLE
-- ============================================

CREATE TABLE chatbot_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100) NOT NULL,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    language VARCHAR(20) DEFAULT 'english',
    intent VARCHAR(100),
    confidence_score DECIMAL(3, 2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chatbot_interactions_user ON chatbot_interactions(user_id);
CREATE INDEX idx_chatbot_interactions_session ON chatbot_interactions(session_id);
CREATE INDEX idx_chatbot_interactions_created ON chatbot_interactions(created_at);

-- ============================================
-- OTP TABLE
-- ============================================

CREATE TABLE otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'login',
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otps_phone ON otps(phone);
CREATE INDEX idx_otps_expires ON otps(expires_at);

-- ============================================
-- AUDIT LOG TABLE
-- ============================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lawyers_updated_at BEFORE UPDATE ON lawyers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update lawyer stats after review
CREATE OR REPLACE FUNCTION update_lawyer_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE lawyers
    SET 
        rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE lawyer_id = NEW.lawyer_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE lawyer_id = NEW.lawyer_id
        )
    WHERE id = NEW.lawyer_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lawyer_stats_on_review
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_lawyer_stats();

-- Increment function for consultations count
CREATE OR REPLACE FUNCTION increment(table_name TEXT, column_name TEXT, row_id UUID)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE %I SET %I = %I + 1 WHERE id = $1', table_name, column_name, column_name)
    USING row_id;
END;
$$ language 'plpgsql';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_interactions ENABLE ROW LEVEL SECURITY;

-- Service role bypass (for backend API using service_role key)
CREATE POLICY "Service role bypass users" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass lawyers" ON lawyers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass availability" ON lawyer_availability FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass consultations" ON consultations FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass payments" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass reviews" ON reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass cases" ON cases FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass reminders" ON reminders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass chatbot" ON chatbot_interactions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read for verified lawyers
CREATE POLICY "Anyone can view verified lawyers" ON lawyers
    FOR SELECT TO anon, authenticated USING (is_verified = true);

-- Public read for reviews
CREATE POLICY "Anyone can view reviews" ON reviews
    FOR SELECT TO anon, authenticated USING (true);

-- ============================================
-- STORAGE BUCKETS (create manually in Supabase Dashboard -> Storage)
-- ============================================
-- 1. profile-photos (public)
-- 2. lawyer-documents (private)
-- 3. case-documents (private)

COMMIT;
