-- ============================================
-- Migration 010: Security Fixes
-- Fixes all Supabase Database Linter security issues
-- ============================================

-- ============================================
-- PART 1: Enable RLS on all public tables that are missing it
-- ============================================

-- Enable RLS on tables that have policies but RLS disabled
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tables exposed to PostgREST without RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 2: Create proper RLS policies for newly enabled tables
-- ============================================

-- Announcements: Public read for active, admin full access
DROP POLICY IF EXISTS "announcements_public_read" ON public.announcements;
CREATE POLICY "announcements_public_read" ON public.announcements
    FOR SELECT USING (
        is_active = TRUE 
        AND (expires_at IS NULL OR expires_at > NOW())
    );

DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;
CREATE POLICY "announcements_admin_all" ON public.announcements
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Disputes: Users can see their own, admins see all
DROP POLICY IF EXISTS "disputes_user_own" ON public.disputes;
CREATE POLICY "disputes_user_own" ON public.disputes
    FOR SELECT USING (
        auth.uid() = reported_by 
        OR auth.uid() = reported_against
    );

DROP POLICY IF EXISTS "disputes_user_create" ON public.disputes;
CREATE POLICY "disputes_user_create" ON public.disputes
    FOR INSERT WITH CHECK (auth.uid() = reported_by);

DROP POLICY IF EXISTS "disputes_admin_all" ON public.disputes;
CREATE POLICY "disputes_admin_all" ON public.disputes
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Platform Settings: Public read, admin write
DROP POLICY IF EXISTS "platform_settings_public_read" ON public.platform_settings;
CREATE POLICY "platform_settings_public_read" ON public.platform_settings
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "platform_settings_admin_write" ON public.platform_settings;
CREATE POLICY "platform_settings_admin_write" ON public.platform_settings
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Admin Notifications: Only admins
DROP POLICY IF EXISTS "admin_notifications_admin_only" ON public.admin_notifications;
CREATE POLICY "admin_notifications_admin_only" ON public.admin_notifications
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- User Warnings: Users see their own, admins see all
DROP POLICY IF EXISTS "user_warnings_user_own" ON public.user_warnings;
CREATE POLICY "user_warnings_user_own" ON public.user_warnings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_warnings_admin_all" ON public.user_warnings;
CREATE POLICY "user_warnings_admin_all" ON public.user_warnings
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ============================================
-- PART 3: Fix SECURITY DEFINER views - recreate as SECURITY INVOKER
-- ============================================

-- Drop and recreate v_verified_lawyers with SECURITY INVOKER
DROP VIEW IF EXISTS public.v_verified_lawyers;
CREATE VIEW public.v_verified_lawyers
WITH (security_invoker = true)
AS
SELECT 
    l.id,
    l.user_id,
    u.first_name,
    u.last_name,
    u.display_name,
    u.avatar_url,
    l.bar_council_number,
    l.experience_years,
    l.specializations,
    l.languages_spoken,
    l.bio,
    l.consultation_fee,
    l.rating,
    l.total_reviews,
    l.total_consultations,
    l.profile_completion_percentage,
    l.is_available,
    l.office_city,
    l.office_state
FROM public.lawyers l
JOIN public.users u ON l.user_id = u.id
WHERE l.verification_status = 'verified'
  AND l.is_available = TRUE
  AND u.is_active = TRUE
  AND u.is_banned = FALSE;

-- Drop and recreate v_admin_dashboard_stats with SECURITY INVOKER
DROP VIEW IF EXISTS public.v_admin_dashboard_stats;
CREATE VIEW public.v_admin_dashboard_stats
WITH (security_invoker = true)
AS
SELECT 
    (SELECT COUNT(*) FROM public.users WHERE is_deleted = FALSE) as total_users,
    (SELECT COUNT(*) FROM public.users WHERE role = 'user' AND is_deleted = FALSE) as total_clients,
    (SELECT COUNT(*) FROM public.lawyers) as total_lawyers,
    (SELECT COUNT(*) FROM public.lawyers WHERE verification_status = 'verified') as verified_lawyers,
    (SELECT COUNT(*) FROM public.lawyers WHERE verification_status = 'pending') as pending_lawyers,
    (SELECT COUNT(*) FROM public.consultations) as total_consultations,
    (SELECT COUNT(*) FROM public.consultations WHERE status = 'completed') as completed_consultations,
    (SELECT COUNT(*) FROM public.consultations WHERE status = 'pending') as pending_consultations,
    (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE status = 'success') as total_revenue,
    (SELECT COUNT(*) FROM public.cases) as total_cases,
    (SELECT COUNT(*) FROM public.disputes WHERE status = 'open') as open_disputes;

-- ============================================
-- PART 4: Fix functions with mutable search_path
-- Add SET search_path = '' to all functions
-- Must DROP first since CREATE OR REPLACE can't change return type
-- ============================================

-- Drop all functions first to allow recreation with potential signature changes
-- Using CASCADE to drop dependent triggers (they will be recreated)
-- Drop ALL possible signatures that might exist in the database from previous migrations

-- Trigger functions (no parameters)
DROP FUNCTION IF EXISTS public.generate_payment_reference() CASCADE;
DROP FUNCTION IF EXISTS public.update_lawyer_stats_on_review() CASCADE;
DROP FUNCTION IF EXISTS public.update_lawyer_consultation_stats() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_lawyer_profile_completion() CASCADE;
DROP FUNCTION IF EXISTS public.track_consultation_status_history() CASCADE;
DROP FUNCTION IF EXISTS public.update_lawyer_stats() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.generate_consultation_reference() CASCADE;
DROP FUNCTION IF EXISTS public.update_chat_room_on_message() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- increment_counter - drop all possible signatures
DROP FUNCTION IF EXISTS public.increment_counter(TEXT, TEXT, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.increment_counter(TEXT) CASCADE;

-- increment - drop all possible signatures
DROP FUNCTION IF EXISTS public.increment(UUID, TEXT, TEXT) CASCADE;

-- mark_messages_as_read
DROP FUNCTION IF EXISTS public.mark_messages_as_read(UUID, UUID) CASCADE;

-- get_or_create_chat_room
DROP FUNCTION IF EXISTS public.get_or_create_chat_room(UUID, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_chat_room(UUID, UUID) CASCADE;

-- get_active_announcements - drop all possible signatures from different migrations
DROP FUNCTION IF EXISTS public.get_active_announcements(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_active_announcements() CASCADE;

-- calculate_lawyer_score
DROP FUNCTION IF EXISTS public.calculate_lawyer_score(UUID) CASCADE;

-- create_lawyer_from_registration - THIS IS CRITICAL - drop both signatures!
DROP FUNCTION IF EXISTS public.create_lawyer_from_registration(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_lawyer_from_registration(UUID) CASCADE;

-- reschedule_consultation
DROP FUNCTION IF EXISTS public.reschedule_consultation(UUID, TIMESTAMPTZ, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.reschedule_consultation(UUID, TIMESTAMP, TEXT) CASCADE;

-- get_notification_counts
DROP FUNCTION IF EXISTS public.get_notification_counts(UUID) CASCADE;

-- sync_existing_auth_users
DROP FUNCTION IF EXISTS public.sync_existing_auth_users() CASCADE;

-- Fix generate_payment_reference (trigger function)
CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.payment_reference IS NULL THEN
        NEW.payment_reference := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
               UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
    END IF;
    RETURN NEW;
END;
$$;

-- Fix update_lawyer_stats_on_review
CREATE OR REPLACE FUNCTION public.update_lawyer_stats_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.lawyers
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating), 0)
            FROM public.reviews
            WHERE lawyer_id = NEW.lawyer_id AND is_visible = TRUE
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM public.reviews
            WHERE lawyer_id = NEW.lawyer_id AND is_visible = TRUE
        ),
        updated_at = NOW()
    WHERE id = NEW.lawyer_id;
    RETURN NEW;
END;
$$;

-- Fix update_lawyer_consultation_stats
CREATE OR REPLACE FUNCTION public.update_lawyer_consultation_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE public.lawyers
        SET 
            total_consultations = total_consultations + 1,
            updated_at = NOW()
        WHERE id = NEW.lawyer_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Fix calculate_lawyer_profile_completion
CREATE OR REPLACE FUNCTION public.calculate_lawyer_profile_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    completion INTEGER := 0;
    total_fields INTEGER := 10;
    filled_fields INTEGER := 0;
BEGIN
    IF NEW.bar_council_number IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.experience_years IS NOT NULL AND NEW.experience_years > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.specializations IS NOT NULL AND array_length(NEW.specializations, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.languages_spoken IS NOT NULL AND array_length(NEW.languages_spoken, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.bio IS NOT NULL AND LENGTH(NEW.bio) > 50 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.consultation_fee IS NOT NULL AND NEW.consultation_fee > 0 THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.office_city IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.office_state IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.office_address IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
    IF NEW.education IS NOT NULL AND jsonb_array_length(NEW.education) > 0 THEN filled_fields := filled_fields + 1; END IF;
    
    NEW.profile_completion_percentage := (filled_fields * 100) / total_fields;
    RETURN NEW;
END;
$$;

-- Fix track_consultation_status_history
-- Updates the status_history JSONB column in consultations table
CREATE OR REPLACE FUNCTION public.track_consultation_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Fix increment_counter (matches original schema signature)
CREATE OR REPLACE FUNCTION public.increment_counter(
    p_table_name TEXT,
    p_column_name TEXT,
    p_row_id UUID,
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    EXECUTE format(
        'UPDATE public.%I SET %I = %I + $1, updated_at = NOW() WHERE id = $2',
        p_table_name, p_column_name, p_column_name
    ) USING p_increment, p_row_id;
END;
$$;

-- Fix increment (generic)
CREATE OR REPLACE FUNCTION public.increment(row_id UUID, field_name TEXT, table_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    EXECUTE format('UPDATE public.%I SET %I = %I + 1 WHERE id = $1', table_name, field_name, field_name)
    USING row_id;
END;
$$;

-- Fix update_lawyer_stats
CREATE OR REPLACE FUNCTION public.update_lawyer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.lawyers
    SET 
        total_consultations = (
            SELECT COUNT(*) FROM public.consultations 
            WHERE lawyer_id = NEW.lawyer_id AND status = 'completed'
        ),
        updated_at = NOW()
    WHERE id = NEW.lawyer_id;
    RETURN NEW;
END;
$$;

-- Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix generate_consultation_reference (trigger function)
CREATE OR REPLACE FUNCTION public.generate_consultation_reference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF NEW.reference_number IS NULL THEN
        NEW.reference_number := 'CON-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
               UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));
    END IF;
    RETURN NEW;
END;
$$;

-- Fix update_chat_room_on_message
CREATE OR REPLACE FUNCTION public.update_chat_room_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.chat_rooms
    SET 
        last_message_at = NOW(),
        last_message_preview = LEFT(NEW.content, 100),
        updated_at = NOW()
    WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$;

-- Fix mark_messages_as_read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_room_id UUID, p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.chat_messages
    SET 
        is_read = TRUE,
        read_at = NOW()
    WHERE room_id = p_room_id 
      AND sender_id != p_user_id 
      AND is_read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- Fix get_or_create_chat_room
CREATE OR REPLACE FUNCTION public.get_or_create_chat_room(
    p_user1_id UUID,
    p_user2_id UUID,
    p_consultation_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    room_id UUID;
BEGIN
    SELECT id INTO room_id
    FROM public.chat_rooms
    WHERE (user1_id = p_user1_id AND user2_id = p_user2_id)
       OR (user1_id = p_user2_id AND user2_id = p_user1_id);
    
    IF room_id IS NULL THEN
        INSERT INTO public.chat_rooms (user1_id, user2_id, consultation_id)
        VALUES (p_user1_id, p_user2_id, p_consultation_id)
        RETURNING id INTO room_id;
    END IF;
    
    RETURN room_id;
END;
$$;

-- Fix get_active_announcements
CREATE OR REPLACE FUNCTION public.get_active_announcements(p_target_audience TEXT DEFAULT 'all')
RETURNS SETOF public.announcements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.announcements
    WHERE is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (target_audience = 'all' OR target_audience = p_target_audience)
    ORDER BY 
        CASE type 
            WHEN 'urgent' THEN 1 
            WHEN 'warning' THEN 2 
            WHEN 'maintenance' THEN 3 
            ELSE 4 
        END,
        created_at DESC;
END;
$$;

-- Fix calculate_lawyer_score
CREATE OR REPLACE FUNCTION public.calculate_lawyer_score(p_lawyer_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_score NUMERIC := 0;
    v_lawyer RECORD;
BEGIN
    SELECT * INTO v_lawyer FROM public.lawyers WHERE id = p_lawyer_id;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Rating weight: 40%
    v_score := v_score + (COALESCE(v_lawyer.rating, 0) * 8);
    
    -- Experience weight: 20%
    v_score := v_score + LEAST(COALESCE(v_lawyer.experience_years, 0) * 2, 20);
    
    -- Consultations weight: 20%
    v_score := v_score + LEAST(COALESCE(v_lawyer.total_consultations, 0) * 0.2, 20);
    
    -- Profile completion weight: 10%
    v_score := v_score + (COALESCE(v_lawyer.profile_completion_percentage, 0) * 0.1);
    
    -- Response rate weight: 10%
    v_score := v_score + (COALESCE(v_lawyer.response_rate, 0) * 0.1);
    
    RETURN ROUND(v_score, 2);
END;
$$;

-- Fix create_lawyer_from_registration (matches migration 007 signature)
CREATE OR REPLACE FUNCTION public.create_lawyer_from_registration(request_id UUID, admin_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    reg_request public.lawyer_registration_requests%ROWTYPE;
    new_lawyer_id UUID;
BEGIN
    -- Get the registration request
    SELECT * INTO reg_request FROM public.lawyer_registration_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registration request not found or not pending';
    END IF;
    
    -- Update user role to lawyer
    UPDATE public.users SET role = 'lawyer', updated_at = NOW()
    WHERE id = reg_request.user_id;
    
    -- Create lawyer profile
    INSERT INTO public.lawyers (
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
        FALSE
    ) RETURNING id INTO new_lawyer_id;
    
    -- Update registration request status
    UPDATE public.lawyer_registration_requests 
    SET status = 'approved', reviewed_by = admin_id, reviewed_at = NOW()
    WHERE id = request_id;
    
    RETURN new_lawyer_id;
END;
$$;

-- Fix reschedule_consultation
CREATE OR REPLACE FUNCTION public.reschedule_consultation(
    p_consultation_id UUID,
    p_new_date TIMESTAMPTZ,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_old_date TIMESTAMPTZ;
BEGIN
    SELECT scheduled_at INTO v_old_date 
    FROM public.consultations 
    WHERE id = p_consultation_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    UPDATE public.consultations
    SET 
        scheduled_at = p_new_date,
        status = 'rescheduled',
        rescheduled_at = NOW(),
        reschedule_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_consultation_id;
    
    RETURN TRUE;
END;
$$;

-- Fix get_notification_counts
CREATE OR REPLACE FUNCTION public.get_notification_counts(p_user_id UUID)
RETURNS TABLE(total BIGINT, unread BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total,
        COUNT(*) FILTER (WHERE is_read = FALSE)::BIGINT as unread
    FROM public.notifications
    WHERE user_id = p_user_id;
END;
$$;

-- Fix handle_new_user (from migration 009)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_first_name VARCHAR(100);
  v_last_name VARCHAR(100);
  v_full_name TEXT;
BEGIN
  -- Extract full name from metadata
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    ''
  );
  
  -- Extract first name (minimum 2 chars required by constraint)
  v_first_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
    NULLIF(TRIM(SPLIT_PART(v_full_name, ' ', 1)), ''),
    'User'
  );
  
  -- Ensure first_name meets minimum length requirement
  IF LENGTH(v_first_name) < 2 THEN
    v_first_name := 'User';
  END IF;
  
  -- Extract last name
  v_last_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''),
    NULLIF(TRIM(SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1)), '')
  );
  
  -- Insert with explicit enum casting
  INSERT INTO public.users (
    id,
    email,
    phone,
    first_name,
    last_name,
    role,
    status,
    is_active,
    is_email_verified,
    is_phone_verified,
    preferred_language,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    v_first_name,
    v_last_name,
    'user'::public.user_role,
    'active'::public.user_status,
    TRUE,
    COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
    COALESCE(NEW.phone_confirmed_at IS NOT NULL, FALSE),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, public.users.email),
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    is_email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, public.users.is_email_verified),
    is_phone_verified = COALESCE(NEW.phone_confirmed_at IS NOT NULL, public.users.is_phone_verified),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block auth user creation
    RAISE WARNING 'handle_new_user trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Fix sync_existing_auth_users
CREATE OR REPLACE FUNCTION public.sync_existing_auth_users()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  sync_count INTEGER := 0;
  auth_user RECORD;
  v_first_name VARCHAR(100);
  v_last_name VARCHAR(100);
  v_full_name TEXT;
BEGIN
  FOR auth_user IN 
    SELECT 
      au.id,
      au.email,
      au.phone,
      au.raw_user_meta_data,
      au.email_confirmed_at,
      au.phone_confirmed_at,
      au.created_at
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    -- Extract full name from metadata
    v_full_name := COALESCE(
      auth_user.raw_user_meta_data->>'full_name',
      auth_user.raw_user_meta_data->>'name',
      ''
    );
    
    -- Extract first name (minimum 2 chars required by constraint)
    v_first_name := COALESCE(
      NULLIF(TRIM(auth_user.raw_user_meta_data->>'first_name'), ''),
      NULLIF(TRIM(SPLIT_PART(v_full_name, ' ', 1)), ''),
      'User'
    );
    
    -- Ensure first_name meets minimum length requirement
    IF LENGTH(v_first_name) < 2 THEN
      v_first_name := 'User';
    END IF;
    
    -- Extract last name
    v_last_name := COALESCE(
      NULLIF(TRIM(auth_user.raw_user_meta_data->>'last_name'), ''),
      NULLIF(TRIM(SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name) + 1)), '')
    );
    
    INSERT INTO public.users (
      id,
      email,
      phone,
      first_name,
      last_name,
      role,
      status,
      is_active,
      is_email_verified,
      is_phone_verified,
      preferred_language,
      created_at,
      updated_at
    )
    VALUES (
      auth_user.id,
      auth_user.email,
      auth_user.phone,
      v_first_name,
      v_last_name,
      'user'::public.user_role,
      'active'::public.user_status,
      TRUE,
      COALESCE(auth_user.email_confirmed_at IS NOT NULL, FALSE),
      COALESCE(auth_user.phone_confirmed_at IS NOT NULL, FALSE),
      'en',
      COALESCE(auth_user.created_at, NOW()),
      NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    sync_count := sync_count + 1;
  END LOOP;
  
  RETURN sync_count;
END;
$$;

-- ============================================
-- PART 5: Move pg_trgm extension to extensions schema
-- ============================================

-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move pg_trgm to extensions schema (drop and recreate)
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;

-- ============================================
-- PART 6: Recreate triggers that were dropped with CASCADE
-- ============================================

-- Trigger: auto-generate payment reference
DROP TRIGGER IF EXISTS trigger_payment_reference ON public.payments;
CREATE TRIGGER trigger_payment_reference
    BEFORE INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_payment_reference();

-- Trigger: auto-generate consultation reference
DROP TRIGGER IF EXISTS trigger_consultation_reference ON public.consultations;
CREATE TRIGGER trigger_consultation_reference
    BEFORE INSERT ON public.consultations
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_consultation_reference();

-- Trigger: update lawyer stats on review
DROP TRIGGER IF EXISTS trigger_update_lawyer_stats_on_review ON public.reviews;
CREATE TRIGGER trigger_update_lawyer_stats_on_review
    AFTER INSERT OR UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_lawyer_stats_on_review();

-- Trigger: update lawyer consultation stats
DROP TRIGGER IF EXISTS trigger_update_lawyer_consultation_stats ON public.consultations;
CREATE TRIGGER trigger_update_lawyer_consultation_stats
    AFTER UPDATE ON public.consultations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_lawyer_consultation_stats();

-- Trigger: calculate lawyer profile completion
DROP TRIGGER IF EXISTS trigger_calculate_lawyer_profile_completion ON public.lawyers;
CREATE TRIGGER trigger_calculate_lawyer_profile_completion
    BEFORE INSERT OR UPDATE ON public.lawyers
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_lawyer_profile_completion();

-- Trigger: track consultation status history (BEFORE UPDATE since it modifies NEW)
DROP TRIGGER IF EXISTS trigger_track_consultation_status_history ON public.consultations;
DROP TRIGGER IF EXISTS trigger_consultation_status_history ON public.consultations;
CREATE TRIGGER trigger_consultation_status_history
    BEFORE UPDATE ON public.consultations
    FOR EACH ROW
    EXECUTE FUNCTION public.track_consultation_status_history();

-- Trigger: update chat room on message
DROP TRIGGER IF EXISTS trigger_update_chat_room_on_message ON public.chat_messages;
CREATE TRIGGER trigger_update_chat_room_on_message
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_chat_room_on_message();

-- Trigger: handle new user (on auth.users)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Triggers: update_updated_at on tables that have updated_at column
-- Based on actual schema: users, lawyers, lawyer_availability, consultations, payments, reviews, cases, reminders, chat_rooms

DROP TRIGGER IF EXISTS set_updated_at ON public.users;
DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.lawyers;
DROP TRIGGER IF EXISTS trigger_lawyers_updated_at ON public.lawyers;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lawyers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.lawyer_availability;
DROP TRIGGER IF EXISTS trigger_lawyer_availability_updated_at ON public.lawyer_availability;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.lawyer_availability
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.consultations;
DROP TRIGGER IF EXISTS trigger_consultations_updated_at ON public.consultations;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.consultations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.payments;
DROP TRIGGER IF EXISTS trigger_payments_updated_at ON public.payments;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.reviews;
DROP TRIGGER IF EXISTS trigger_reviews_updated_at ON public.reviews;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.cases;
DROP TRIGGER IF EXISTS trigger_cases_updated_at ON public.cases;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.reminders;
DROP TRIGGER IF EXISTS trigger_reminders_updated_at ON public.reminders;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reminders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_updated_at ON public.chat_rooms;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.chat_rooms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PART 7: Grant permissions
-- ============================================

-- Grant execute permissions on callable functions ONLY
-- NOTE: Trigger functions (RETURNS TRIGGER) don't need GRANT - they run under trigger owner context
-- Only grant on functions that are called directly via RPC or from application code

-- Utility functions
GRANT EXECUTE ON FUNCTION public.increment_counter(TEXT, TEXT, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment(UUID, TEXT, TEXT) TO service_role;

-- Chat functions (user-callable)
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID, UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_chat_room(UUID, UUID, UUID) TO service_role, authenticated;

-- Public/authenticated functions
GRANT EXECUTE ON FUNCTION public.get_active_announcements(TEXT) TO service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.calculate_lawyer_score(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_lawyer_from_registration(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.reschedule_consultation(UUID, TIMESTAMPTZ, TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.get_notification_counts(UUID) TO service_role, authenticated;

-- Admin utility functions
GRANT EXECUTE ON FUNCTION public.sync_existing_auth_users() TO service_role;

-- Grant select on views
GRANT SELECT ON public.v_verified_lawyers TO anon, authenticated, service_role;
GRANT SELECT ON public.v_admin_dashboard_stats TO service_role;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger function to create user profile when auth user is created. Has secure search_path.';
COMMENT ON FUNCTION public.sync_existing_auth_users() IS 'Syncs existing auth.users to public.users table. Run: SELECT sync_existing_auth_users();';

-- ============================================
-- NOTE: Leaked Password Protection
-- This must be enabled in Supabase Dashboard:
-- Authentication > Settings > Enable "Leaked Password Protection"
-- OR via Supabase Management API
-- ============================================
