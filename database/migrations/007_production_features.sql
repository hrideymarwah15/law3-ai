-- ============================================
-- Migration 007: Production Features
-- Consultation Reschedule, Lawyer Registration, Notifications Enhancement
-- ============================================

BEGIN;

-- ============================================
-- 1. LAWYER REGISTRATION REQUESTS TABLE
-- For lawyer self-registration workflow
-- ============================================

CREATE TABLE IF NOT EXISTS lawyer_registration_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User who submitted the request
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Professional Information
    bar_council_number VARCHAR(100) NOT NULL,
    bar_council_state VARCHAR(100) NOT NULL,
    bar_council_enrollment_date DATE,
    license_number VARCHAR(100),
    
    -- Specialization
    specialization VARCHAR(100) NOT NULL,
    specializations TEXT[] DEFAULT '{}',
    experience_years INTEGER NOT NULL DEFAULT 0,
    
    -- Personal Information
    bio TEXT,
    headline VARCHAR(200),
    
    -- Consultation Settings
    consultation_fee INTEGER NOT NULL DEFAULT 0,
    consultation_duration INTEGER DEFAULT 30,
    
    -- Office Information
    office_name VARCHAR(200),
    office_address TEXT,
    office_city VARCHAR(100) NOT NULL,
    office_state VARCHAR(100) NOT NULL,
    office_pincode VARCHAR(10),
    office_phone VARCHAR(15),
    office_email VARCHAR(255),
    
    -- Education & Credentials
    education JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    
    -- Languages & Courts
    languages_spoken TEXT[] DEFAULT '{English}'::text[],
    practice_areas TEXT[] DEFAULT '{}',
    courts_practiced TEXT[] DEFAULT '{}',
    
    -- Documents (URLs to uploaded files)
    bar_council_certificate_url TEXT,
    id_proof_type VARCHAR(50),
    id_proof_url TEXT,
    address_proof_url TEXT,
    profile_photo_url TEXT,
    additional_documents JSONB DEFAULT '[]'::jsonb,
    
    -- Review Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- pending, under_review, approved, rejected, requires_changes
    
    -- Review Information
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    rejection_reason TEXT,
    changes_requested TEXT,
    
    -- Resubmission Tracking
    submission_count INTEGER NOT NULL DEFAULT 1,
    last_submitted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT lawyer_reg_bar_council_unique UNIQUE (bar_council_number, bar_council_state),
    CONSTRAINT lawyer_reg_user_unique UNIQUE (user_id),
    CONSTRAINT lawyer_reg_status_valid CHECK (
        status IN ('pending', 'under_review', 'approved', 'rejected', 'requires_changes')
    ),
    CONSTRAINT lawyer_reg_experience_valid CHECK (experience_years >= 0 AND experience_years <= 70),
    CONSTRAINT lawyer_reg_fee_valid CHECK (consultation_fee >= 0)
);

-- Indexes
CREATE INDEX idx_lawyer_reg_user ON lawyer_registration_requests(user_id);
CREATE INDEX idx_lawyer_reg_status ON lawyer_registration_requests(status);
CREATE INDEX idx_lawyer_reg_bar_council ON lawyer_registration_requests(bar_council_number, bar_council_state);
CREATE INDEX idx_lawyer_reg_created ON lawyer_registration_requests(created_at);

-- Trigger for updated_at
CREATE TRIGGER trigger_lawyer_reg_updated_at
    BEFORE UPDATE ON lawyer_registration_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE lawyer_registration_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_lawyer_reg" ON lawyer_registration_requests FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- 2. CONSULTATION RESCHEDULE HISTORY TABLE
-- Track all reschedule operations
-- ============================================

CREATE TABLE IF NOT EXISTS consultation_reschedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- References
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    
    -- Original Schedule
    original_date DATE NOT NULL,
    original_time TIME NOT NULL,
    original_scheduled_start TIMESTAMPTZ NOT NULL,
    original_scheduled_end TIMESTAMPTZ NOT NULL,
    
    -- New Schedule
    new_date DATE NOT NULL,
    new_time TIME NOT NULL,
    new_scheduled_start TIMESTAMPTZ NOT NULL,
    new_scheduled_end TIMESTAMPTZ NOT NULL,
    
    -- Who rescheduled
    rescheduled_by UUID NOT NULL REFERENCES users(id),
    rescheduled_by_role VARCHAR(20) NOT NULL, -- 'user', 'lawyer', 'admin'
    
    -- Reason
    reason TEXT NOT NULL,
    
    -- Acceptance (if lawyer/user initiated reschedule)
    requires_acceptance BOOLEAN NOT NULL DEFAULT FALSE,
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES users(id),
    rejected_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'completed',
    -- 'pending_acceptance', 'completed', 'rejected', 'expired'
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reschedule_consultation ON consultation_reschedules(consultation_id);
CREATE INDEX idx_reschedule_created ON consultation_reschedules(created_at);
CREATE INDEX idx_reschedule_status ON consultation_reschedules(status);

-- RLS
ALTER TABLE consultation_reschedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_reschedules" ON consultation_reschedules FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- 3. ENHANCE NOTIFICATIONS TABLE
-- Add more fields for rich notifications
-- ============================================

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Priority
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'priority') THEN
        ALTER TABLE notifications ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
    END IF;
    
    -- Category for filtering
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'category') THEN
        ALTER TABLE notifications ADD COLUMN category VARCHAR(50) DEFAULT 'general';
    END IF;
    
    -- Image URL for rich notifications
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'image_url') THEN
        ALTER TABLE notifications ADD COLUMN image_url TEXT;
    END IF;
    
    -- Deep link for mobile apps
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'deep_link') THEN
        ALTER TABLE notifications ADD COLUMN deep_link TEXT;
    END IF;
    
    -- Dismissible flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'is_dismissible') THEN
        ALTER TABLE notifications ADD COLUMN is_dismissible BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Grouped notifications
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'group_key') THEN
        ALTER TABLE notifications ADD COLUMN group_key VARCHAR(100);
    END IF;
END $$;

-- Create additional indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(user_id, category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(user_id, priority) WHERE priority = 'high';
CREATE INDEX IF NOT EXISTS idx_notifications_group ON notifications(user_id, group_key) WHERE group_key IS NOT NULL;


-- ============================================
-- 4. USER DELETION AUDIT TABLE
-- Track account deletions for compliance
-- ============================================

CREATE TABLE IF NOT EXISTS user_deletion_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Original User ID (preserved even after deletion)
    user_id UUID NOT NULL,
    
    -- User Info (anonymized but preserved for legal)
    email_hash VARCHAR(64), -- SHA-256 hash of email
    phone_hash VARCHAR(64), -- SHA-256 hash of phone
    role VARCHAR(20) NOT NULL,
    
    -- Deletion Info
    deletion_type VARCHAR(50) NOT NULL, -- 'user_requested', 'admin_deleted', 'inactive_cleanup', 'gdpr_request'
    deletion_reason TEXT,
    
    -- Who initiated
    deleted_by UUID, -- NULL if self-deleted
    
    -- Data Retained (for legal compliance)
    consultations_count INTEGER DEFAULT 0,
    payments_count INTEGER DEFAULT 0,
    
    -- Grace Period
    scheduled_permanent_deletion TIMESTAMPTZ,
    is_permanently_deleted BOOLEAN DEFAULT FALSE,
    permanently_deleted_at TIMESTAMPTZ,
    
    -- Recovery
    recovery_token VARCHAR(100),
    recovery_expires_at TIMESTAMPTZ,
    recovered_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deletion_audit_user ON user_deletion_audit(user_id);
CREATE INDEX idx_deletion_audit_email ON user_deletion_audit(email_hash);
CREATE INDEX idx_deletion_audit_recovery ON user_deletion_audit(recovery_token) WHERE recovery_token IS NOT NULL;
CREATE INDEX idx_deletion_audit_scheduled ON user_deletion_audit(scheduled_permanent_deletion) WHERE is_permanently_deleted = FALSE;

-- RLS
ALTER TABLE user_deletion_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_deletion_audit" ON user_deletion_audit FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- 5. LAWYER DOCUMENT UPLOADS TABLE
-- Track document uploads for lawyers
-- ============================================

CREATE TABLE IF NOT EXISTS lawyer_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Owner
    lawyer_id UUID REFERENCES lawyers(id) ON DELETE CASCADE,
    registration_request_id UUID REFERENCES lawyer_registration_requests(id) ON DELETE CASCADE,
    
    -- Document Info
    document_type VARCHAR(50) NOT NULL,
    -- 'bar_certificate', 'id_proof', 'address_proof', 'degree_certificate', 'experience_letter', 'other'
    
    document_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER, -- in bytes
    mime_type VARCHAR(100),
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    verification_notes TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'verified', 'rejected', 'expired'
    
    expiry_date DATE, -- For documents that expire
    
    -- Timestamps
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT lawyer_doc_owner_required CHECK (
        lawyer_id IS NOT NULL OR registration_request_id IS NOT NULL
    )
);

-- Indexes
CREATE INDEX idx_lawyer_docs_lawyer ON lawyer_documents(lawyer_id) WHERE lawyer_id IS NOT NULL;
CREATE INDEX idx_lawyer_docs_request ON lawyer_documents(registration_request_id) WHERE registration_request_id IS NOT NULL;
CREATE INDEX idx_lawyer_docs_type ON lawyer_documents(document_type);
CREATE INDEX idx_lawyer_docs_status ON lawyer_documents(status);

-- RLS
ALTER TABLE lawyer_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all_lawyer_docs" ON lawyer_documents FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ============================================
-- 6. FUNCTIONS FOR NEW FEATURES
-- ============================================

-- Function to create lawyer from approved registration
CREATE OR REPLACE FUNCTION create_lawyer_from_registration(request_id UUID, admin_id UUID)
RETURNS UUID AS $$
DECLARE
    reg_request lawyer_registration_requests%ROWTYPE;
    new_lawyer_id UUID;
BEGIN
    -- Get the registration request
    SELECT * INTO reg_request FROM lawyer_registration_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registration request not found or not pending';
    END IF;
    
    -- Update user role to lawyer
    UPDATE users SET role = 'lawyer', updated_at = NOW()
    WHERE id = reg_request.user_id;
    
    -- Create lawyer profile
    INSERT INTO lawyers (
        user_id,
        bar_council_number,
        bar_council_state,
        bar_council_enrollment_date,
        license_number,
        specialization,
        specializations,
        experience_years,
        bio,
        headline,
        consultation_fee,
        consultation_duration,
        office_name,
        office_address,
        office_city,
        office_state,
        office_pincode,
        office_phone,
        office_email,
        education,
        certifications,
        languages_spoken,
        practice_areas,
        courts_practiced,
        bar_council_certificate_url,
        id_proof_type,
        id_proof_url,
        address_proof_url,
        profile_photo_url,
        additional_documents,
        verification_status,
        is_verified,
        verified_at,
        verified_by,
        is_available
    ) VALUES (
        reg_request.user_id,
        reg_request.bar_council_number,
        reg_request.bar_council_state,
        reg_request.bar_council_enrollment_date,
        reg_request.license_number,
        reg_request.specialization,
        reg_request.specializations,
        reg_request.experience_years,
        reg_request.bio,
        reg_request.headline,
        reg_request.consultation_fee,
        reg_request.consultation_duration,
        reg_request.office_name,
        reg_request.office_address,
        reg_request.office_city,
        reg_request.office_state,
        reg_request.office_pincode,
        reg_request.office_phone,
        reg_request.office_email,
        reg_request.education,
        reg_request.certifications,
        reg_request.languages_spoken,
        reg_request.practice_areas,
        reg_request.courts_practiced,
        reg_request.bar_council_certificate_url,
        reg_request.id_proof_type,
        reg_request.id_proof_url,
        reg_request.address_proof_url,
        reg_request.profile_photo_url,
        reg_request.additional_documents,
        'verified',
        TRUE,
        NOW(),
        admin_id,
        FALSE -- Initially not available until they set schedule
    ) RETURNING id INTO new_lawyer_id;
    
    -- Update registration request status
    UPDATE lawyer_registration_requests 
    SET status = 'approved', reviewed_by = admin_id, reviewed_at = NOW()
    WHERE id = request_id;
    
    -- Move documents to lawyer_documents
    INSERT INTO lawyer_documents (lawyer_id, document_type, document_name, file_url, is_verified, verified_at, verified_by, status)
    SELECT 
        new_lawyer_id,
        'bar_certificate',
        'Bar Council Certificate',
        reg_request.bar_council_certificate_url,
        TRUE,
        NOW(),
        admin_id,
        'verified'
    WHERE reg_request.bar_council_certificate_url IS NOT NULL;
    
    RETURN new_lawyer_id;
END;
$$ LANGUAGE plpgsql;


-- Function to reschedule consultation
CREATE OR REPLACE FUNCTION reschedule_consultation(
    p_consultation_id UUID,
    p_new_date DATE,
    p_new_time TIME,
    p_reason TEXT,
    p_rescheduled_by UUID,
    p_rescheduled_by_role VARCHAR(20)
)
RETURNS consultation_reschedules AS $$
DECLARE
    v_consultation consultations%ROWTYPE;
    v_new_start TIMESTAMPTZ;
    v_new_end TIMESTAMPTZ;
    v_reschedule consultation_reschedules%ROWTYPE;
BEGIN
    -- Get current consultation
    SELECT * INTO v_consultation FROM consultations 
    WHERE id = p_consultation_id AND status IN ('pending', 'confirmed');
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Consultation not found or cannot be rescheduled';
    END IF;
    
    -- Check reschedule limit
    IF v_consultation.reschedule_count >= 3 THEN
        RAISE EXCEPTION 'Maximum reschedule limit reached (3 times)';
    END IF;
    
    -- Calculate new timestamps
    v_new_start := (p_new_date || ' ' || p_new_time)::TIMESTAMPTZ;
    v_new_end := v_new_start + (v_consultation.duration || ' minutes')::INTERVAL;
    
    -- Check slot availability
    IF EXISTS (
        SELECT 1 FROM consultations 
        WHERE lawyer_id = v_consultation.lawyer_id
        AND id != p_consultation_id
        AND booking_date = p_new_date
        AND booking_time = p_new_time
        AND status IN ('pending', 'confirmed')
    ) THEN
        RAISE EXCEPTION 'New time slot is not available';
    END IF;
    
    -- Create reschedule record
    INSERT INTO consultation_reschedules (
        consultation_id,
        original_date,
        original_time,
        original_scheduled_start,
        original_scheduled_end,
        new_date,
        new_time,
        new_scheduled_start,
        new_scheduled_end,
        rescheduled_by,
        rescheduled_by_role,
        reason,
        status
    ) VALUES (
        p_consultation_id,
        v_consultation.booking_date,
        v_consultation.booking_time,
        v_consultation.scheduled_start,
        v_consultation.scheduled_end,
        p_new_date,
        p_new_time,
        v_new_start,
        v_new_end,
        p_rescheduled_by,
        p_rescheduled_by_role,
        p_reason,
        'completed'
    ) RETURNING * INTO v_reschedule;
    
    -- Update consultation
    UPDATE consultations SET
        booking_date = p_new_date,
        booking_time = p_new_time,
        scheduled_start = v_new_start,
        scheduled_end = v_new_end,
        reschedule_count = reschedule_count + 1,
        status = 'confirmed',
        meeting_link = NULL, -- Clear old meeting link
        updated_at = NOW()
    WHERE id = p_consultation_id;
    
    RETURN v_reschedule;
END;
$$ LANGUAGE plpgsql;


-- Function to get unread notification count by category
CREATE OR REPLACE FUNCTION get_notification_counts(p_user_id UUID)
RETURNS TABLE (
    total_unread BIGINT,
    category VARCHAR(50),
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM notifications WHERE user_id = p_user_id AND is_read = FALSE) as total_unread,
        n.category,
        COUNT(*) as count
    FROM notifications n
    WHERE n.user_id = p_user_id AND n.is_read = FALSE
    GROUP BY n.category;
END;
$$ LANGUAGE plpgsql;


COMMIT;
