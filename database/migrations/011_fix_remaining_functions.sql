-- ============================================
-- Migration 011: Fix Remaining Functions with Mutable Search Path
-- Fixes functions that still show search_path warnings after migration 010
-- ============================================

-- The issue is that these functions may exist with different signatures
-- than what migration 010 is dropping. This migration aggressively drops
-- ALL overloads of these functions by querying pg_catalog.

-- ============================================
-- PART 1: Drop ALL overloads of problematic functions using DO block
-- ============================================

DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all overloads of 'increment' function
    FOR func_record IN 
        SELECT p.oid::regprocedure::text as func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'increment'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_signature || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', func_record.func_signature;
    END LOOP;

    -- Drop all overloads of 'mark_messages_as_read' function
    FOR func_record IN 
        SELECT p.oid::regprocedure::text as func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'mark_messages_as_read'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_signature || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', func_record.func_signature;
    END LOOP;

    -- Drop all overloads of 'reschedule_consultation' function
    FOR func_record IN 
        SELECT p.oid::regprocedure::text as func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'reschedule_consultation'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_signature || ' CASCADE';
        RAISE NOTICE 'Dropped function: %', func_record.func_signature;
    END LOOP;
END $$;

-- ============================================
-- PART 2: Recreate functions with SET search_path = ''
-- ============================================

-- Fix increment (generic counter function)
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

-- ============================================
-- PART 3: Grant permissions
-- ============================================

GRANT EXECUTE ON FUNCTION public.increment(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_messages_as_read(UUID, UUID) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_consultation(UUID, TIMESTAMPTZ, TEXT) TO service_role, authenticated;

-- ============================================
-- PART 4: Verify functions have secure search_path
-- Run this query after migration to verify:
-- ============================================
-- SELECT 
--     p.proname as function_name,
--     pg_get_function_arguments(p.oid) as arguments,
--     p.proconfig as config
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public' 
--   AND p.proname IN ('increment', 'mark_messages_as_read', 'reschedule_consultation');
-- 
-- The 'config' column should show: {search_path=}

-- ============================================
-- NOTE: Leaked Password Protection
-- ============================================
-- This CANNOT be fixed via SQL. You must enable it in:
-- Supabase Dashboard → Authentication → Settings → Password Security
-- Toggle ON "Leaked Password Protection"
-- 
-- OR via Supabase Management API:
-- PATCH /v1/projects/{project_ref}/config/auth
-- { "password_requirements": { "hibp_enabled": true } }
-- ============================================
