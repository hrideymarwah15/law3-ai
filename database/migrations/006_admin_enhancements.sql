-- Migration: Admin System Enhancements
-- Version: 006
-- Description: Add announcements, disputes, and platform settings tables

-- ============================================
-- ANNOUNCEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'urgent', 'maintenance')),
    target_audience VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'users', 'lawyers')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_active ON announcements(is_active, expires_at) WHERE is_active = true;
CREATE INDEX idx_announcements_target ON announcements(target_audience) WHERE is_active = true;

-- ============================================
-- DISPUTES TABLE
-- ============================================
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');
CREATE TYPE dispute_issue_type AS ENUM ('no_show', 'poor_service', 'misconduct', 'payment_issue', 'other');
CREATE TYPE dispute_resolution AS ENUM ('resolved_for_user', 'resolved_for_lawyer', 'dismissed', 'refunded');

CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES users(id),
    reported_against UUID REFERENCES users(id),
    issue_type dispute_issue_type NOT NULL,
    description TEXT NOT NULL,
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    status dispute_status NOT NULL DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id), -- Admin handling the dispute
    resolution dispute_resolution,
    resolution_notes TEXT,
    refund_amount INTEGER,
    user_warned BOOLEAN DEFAULT false,
    lawyer_warned BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_disputes_consultation ON disputes(consultation_id);
CREATE INDEX idx_disputes_reported_by ON disputes(reported_by);
CREATE INDEX idx_disputes_assigned ON disputes(assigned_to) WHERE status IN ('open', 'under_review');

-- ============================================
-- PLATFORM SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO platform_settings (key, value, description) VALUES
    ('platform_commission_percent', '10', 'Platform commission percentage on each consultation'),
    ('min_consultation_fee', '50000', 'Minimum consultation fee in paisa (₹500)'),
    ('max_consultation_fee', '1000000', 'Maximum consultation fee in paisa (₹10,000)'),
    ('cancellation_window_hours', '24', 'Hours before consultation when free cancellation is allowed'),
    ('auto_complete_after_hours', '48', 'Hours after scheduled time to auto-complete consultation'),
    ('maintenance_mode', 'false', 'Whether platform is in maintenance mode'),
    ('new_registrations_enabled', 'true', 'Whether new user registrations are allowed'),
    ('video_meeting_buffer_minutes', '2', 'Minutes before consultation to generate meeting link'),
    ('max_reschedule_count', '2', 'Maximum times a consultation can be rescheduled'),
    ('lawyer_payout_delay_days', '7', 'Days to wait before processing lawyer payouts')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- ADMIN NOTIFICATIONS TABLE (for bulk notifications)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'in_app' CHECK (type IN ('push', 'email', 'sms', 'in_app')),
    target VARCHAR(20) NOT NULL CHECK (target IN ('all', 'users', 'lawyers', 'specific')),
    target_user_ids UUID[] DEFAULT '{}',
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'completed', 'failed')),
    sent_by UUID REFERENCES users(id),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_notifications_status ON admin_notifications(status);

-- ============================================
-- USER WARNINGS TABLE (track warnings issued)
-- ============================================
CREATE TABLE IF NOT EXISTS user_warnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dispute_id UUID REFERENCES disputes(id),
    reason TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('warning', 'final_warning', 'temporary_ban', 'permanent_ban')),
    expires_at TIMESTAMPTZ, -- For temporary bans
    issued_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_warnings_user ON user_warnings(user_id);
CREATE INDEX idx_user_warnings_severity ON user_warnings(severity);

-- ============================================
-- ADD FIELDS TO EXISTING TABLES
-- ============================================

-- Add warning count to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0;

-- Add dispute count to consultations
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS has_dispute BOOLEAN DEFAULT false;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get active announcements for a user role
CREATE OR REPLACE FUNCTION get_active_announcements(user_role TEXT)
RETURNS SETOF announcements AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM announcements
    WHERE is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (target_audience = 'all' OR target_audience = user_role)
    ORDER BY 
        CASE type 
            WHEN 'urgent' THEN 1 
            WHEN 'warning' THEN 2 
            WHEN 'maintenance' THEN 3 
            ELSE 4 
        END,
        created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate lawyer performance score
CREATE OR REPLACE FUNCTION calculate_lawyer_score(lawyer_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    rating_score NUMERIC;
    completion_rate NUMERIC;
    consultation_count INTEGER;
    final_score NUMERIC;
BEGIN
    -- Get lawyer stats
    SELECT 
        COALESCE(l.rating, 0),
        COALESCE(l.total_consultations, 0)
    INTO rating_score, consultation_count
    FROM lawyers l
    WHERE l.id = lawyer_uuid;

    -- Calculate completion rate
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 100
            ELSE (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100
        END
    INTO completion_rate
    FROM consultations
    WHERE lawyer_id = lawyer_uuid;

    -- Calculate final score (weighted average)
    -- Rating: 50%, Completion Rate: 30%, Activity Bonus: 20%
    final_score := (rating_score * 10) + (completion_rate * 0.3) + LEAST(consultation_count * 0.5, 20);

    RETURN ROUND(final_score, 2);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE announcements IS 'Platform-wide announcements for users and lawyers';
COMMENT ON TABLE disputes IS 'Dispute tickets between users and lawyers';
COMMENT ON TABLE platform_settings IS 'Configurable platform settings';
COMMENT ON TABLE admin_notifications IS 'Bulk notification history';
COMMENT ON TABLE user_warnings IS 'Warning and ban history for users';
