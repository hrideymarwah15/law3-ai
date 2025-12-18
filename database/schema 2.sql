-- Nyaay Saathi Database Schema
-- Run this migration in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================
-- CUSTOM TYPES (ENUMS)
-- ============================================

CREATE TYPE user_role AS ENUM ('user', 'lawyer', 'admin');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE consultation_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'captured', 'failed', 'refunded');
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
    city VARCHAR(100),
    state VARCHAR(100),
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_city ON users(city);

-- ============================================
-- LAWYER PROFILES TABLE
-- ============================================

CREATE TABLE lawyer_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Professional Information
    bar_council_number VARCHAR(100),
    bar_council_state VARCHAR(100),
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
    consultation_fee INTEGER DEFAULT 0, -- in INR
    
    -- Verification
    verification_status verification_status DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Documents
    bar_certificate_url TEXT,
    id_proof_url TEXT,
    profile_photo_url TEXT,
    
    -- Stats (denormalized for performance)
    avg_rating DECIMAL(2, 1) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    total_consultations INTEGER DEFAULT 0,
    
    -- Availability
    is_available BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lawyer_profiles
CREATE INDEX idx_lawyer_profiles_user_id ON lawyer_profiles(user_id);
CREATE INDEX idx_lawyer_profiles_verification_status ON lawyer_profiles(verification_status);
CREATE INDEX idx_lawyer_profiles_office_city ON lawyer_profiles(office_city);
CREATE INDEX idx_lawyer_profiles_specializations ON lawyer_profiles USING GIN(specializations);
CREATE INDEX idx_lawyer_profiles_avg_rating ON lawyer_profiles(avg_rating DESC);
CREATE INDEX idx_lawyer_profiles_consultation_fee ON lawyer_profiles(consultation_fee);

-- Full text search index
CREATE INDEX idx_lawyer_profiles_bio_search ON lawyer_profiles USING GIN(to_tsvector('english', COALESCE(bio, '')));

-- ============================================
-- LAWYER AVAILABILITY TABLE
-- ============================================

CREATE TABLE lawyer_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lawyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 30, -- in minutes
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(lawyer_id, day_of_week, start_time)
);

-- Indexes for availability
CREATE INDEX idx_lawyer_availability_lawyer ON lawyer_availability(lawyer_id);
CREATE INDEX idx_lawyer_availability_day ON lawyer_availability(day_of_week);

-- ============================================
-- CONSULTATIONS TABLE
-- ============================================

CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lawyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration INTEGER DEFAULT 30, -- in minutes
    
    -- Status
    status consultation_status DEFAULT 'pending',
    
    -- Payment
    amount INTEGER NOT NULL, -- in INR
    payment_status payment_status DEFAULT 'pending',
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    payment_error TEXT,
    
    -- Refund
    refund_status VARCHAR(50),
    refund_id VARCHAR(100),
    refund_amount INTEGER,
    
    -- Meeting
    meeting_link TEXT,
    meeting_type VARCHAR(50) DEFAULT 'video', -- video, audio, in_person
    
    -- Notes
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

-- Indexes for consultations
CREATE INDEX idx_consultations_user ON consultations(user_id);
CREATE INDEX idx_consultations_lawyer ON consultations(lawyer_id);
CREATE INDEX idx_consultations_status ON consultations(status);
CREATE INDEX idx_consultations_scheduled ON consultations(scheduled_at);
CREATE INDEX idx_consultations_payment_status ON consultations(payment_status);

-- ============================================
-- REVIEWS TABLE
-- ============================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lawyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reviews
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

-- Indexes for cases
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

-- Indexes for reminders
CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_case ON reminders(case_id);
CREATE INDEX idx_reminders_date ON reminders(reminder_date);
CREATE INDEX idx_reminders_status ON reminders(status);

-- ============================================
-- CHATBOT CONVERSATIONS TABLE
-- ============================================

CREATE TABLE chatbot_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chatbot_conversations
CREATE INDEX idx_chatbot_conversations_user ON chatbot_conversations(user_id);
CREATE INDEX idx_chatbot_conversations_session ON chatbot_conversations(session_id);

-- ============================================
-- CHATBOT MESSAGES TABLE
-- ============================================

CREATE TABLE chatbot_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES chatbot_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for chatbot_messages
CREATE INDEX idx_chatbot_messages_conversation ON chatbot_messages(conversation_id);
CREATE INDEX idx_chatbot_messages_created ON chatbot_messages(created_at);

-- ============================================
-- OTP TABLE (for phone verification)
-- ============================================

CREATE TABLE otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'login', -- login, verification, reset
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for otps
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

-- Indexes for audit_logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lawyer_profiles_updated_at BEFORE UPDATE ON lawyer_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update lawyer stats after review
CREATE OR REPLACE FUNCTION update_lawyer_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE lawyer_profiles
    SET 
        avg_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM reviews
            WHERE lawyer_id = NEW.lawyer_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews
            WHERE lawyer_id = NEW.lawyer_id
        )
    WHERE user_id = NEW.lawyer_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lawyer_stats_on_review
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_lawyer_stats();

-- Function to increment consultation count
CREATE OR REPLACE FUNCTION update_consultation_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE lawyer_profiles
        SET total_consultations = total_consultations + 1
        WHERE user_id = NEW.lawyer_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_consultation_count_trigger
    AFTER UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION update_consultation_count();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawyer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Lawyer profiles policies (public read for verified lawyers)
CREATE POLICY "Anyone can view verified lawyer profiles" ON lawyer_profiles
    FOR SELECT USING (verification_status = 'verified');

CREATE POLICY "Lawyers can update own profile" ON lawyer_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Consultations policies
CREATE POLICY "Users can view own consultations" ON consultations
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = lawyer_id);

CREATE POLICY "Users can create consultations" ON consultations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cases policies
CREATE POLICY "Users can manage own cases" ON cases
    FOR ALL USING (auth.uid() = user_id);

-- Reminders policies
CREATE POLICY "Users can manage own reminders" ON reminders
    FOR ALL USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create own reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STORAGE BUCKETS (run in Supabase Dashboard)
-- ============================================

-- Note: Create these buckets in Supabase Dashboard -> Storage
-- 1. profile-photos (public)
-- 2. lawyer-documents (private)
-- 3. case-documents (private)

-- ============================================
-- SEED DATA (Optional - for development)
-- ============================================

-- Insert default admin user (update with actual values)
-- INSERT INTO users (email, name, role, email_verified)
-- VALUES ('admin@nyaaysaathi.com', 'System Admin', 'admin', true);

COMMIT;
