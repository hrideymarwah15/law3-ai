-- ============================================
-- Migration 012: RLS Policy Performance Optimization
-- ============================================
-- Fixes performance issues where auth.uid() is re-evaluated for each row
-- Solution: Wrap auth.uid() in (select auth.uid()) to cache the value
-- This is a critical production optimization for tables with many rows
-- ============================================

-- ============================================
-- PART 1: Fix chat_rooms RLS policies
-- ============================================

DROP POLICY IF EXISTS chat_rooms_select ON public.chat_rooms;
CREATE POLICY chat_rooms_select ON public.chat_rooms FOR SELECT
    USING (
        (select auth.uid()) = user_id OR 
        (select auth.uid()) IN (SELECT user_id FROM public.lawyers WHERE id = chat_rooms.lawyer_id) OR
        (select auth.uid()) IN (SELECT id FROM public.users WHERE role = 'admin')
    );

DROP POLICY IF EXISTS chat_rooms_insert ON public.chat_rooms;
CREATE POLICY chat_rooms_insert ON public.chat_rooms FOR INSERT
    WITH CHECK (
        (select auth.uid()) = user_id OR 
        (select auth.uid()) IN (SELECT id FROM public.users WHERE role = 'admin')
    );

DROP POLICY IF EXISTS chat_rooms_update ON public.chat_rooms;
CREATE POLICY chat_rooms_update ON public.chat_rooms FOR UPDATE
    USING (
        (select auth.uid()) = user_id OR 
        (select auth.uid()) IN (SELECT user_id FROM public.lawyers WHERE id = chat_rooms.lawyer_id) OR
        (select auth.uid()) IN (SELECT id FROM public.users WHERE role = 'admin')
    );

-- ============================================
-- PART 2: Fix chat_messages RLS policies
-- ============================================

DROP POLICY IF EXISTS chat_messages_select ON public.chat_messages;
CREATE POLICY chat_messages_select ON public.chat_messages FOR SELECT
    USING (
        room_id IN (
            SELECT id FROM public.chat_rooms 
            WHERE user_id = (select auth.uid()) 
            OR lawyer_id IN (SELECT id FROM public.lawyers WHERE user_id = (select auth.uid()))
        ) OR
        (select auth.uid()) IN (SELECT id FROM public.users WHERE role = 'admin')
    );

DROP POLICY IF EXISTS chat_messages_insert ON public.chat_messages;
CREATE POLICY chat_messages_insert ON public.chat_messages FOR INSERT
    WITH CHECK (
        room_id IN (
            SELECT id FROM public.chat_rooms 
            WHERE user_id = (select auth.uid()) 
            OR lawyer_id IN (SELECT id FROM public.lawyers WHERE user_id = (select auth.uid()))
        )
    );

DROP POLICY IF EXISTS chat_messages_update ON public.chat_messages;
CREATE POLICY chat_messages_update ON public.chat_messages FOR UPDATE
    USING (
        sender_id = (select auth.uid()) OR 
        (select auth.uid()) IN (SELECT id FROM public.users WHERE role = 'admin')
    );

-- ============================================
-- PART 3: Fix chat_attachments RLS policies
-- ============================================

DROP POLICY IF EXISTS chat_attachments_select ON public.chat_attachments;
CREATE POLICY chat_attachments_select ON public.chat_attachments FOR SELECT
    USING (
        room_id IN (
            SELECT id FROM public.chat_rooms 
            WHERE user_id = (select auth.uid()) 
            OR lawyer_id IN (SELECT id FROM public.lawyers WHERE user_id = (select auth.uid()))
        ) OR
        (select auth.uid()) IN (SELECT id FROM public.users WHERE role = 'admin')
    );

DROP POLICY IF EXISTS chat_attachments_insert ON public.chat_attachments;
CREATE POLICY chat_attachments_insert ON public.chat_attachments FOR INSERT
    WITH CHECK (uploaded_by = (select auth.uid()));

-- ============================================
-- PART 4: Fix chat_read_receipts RLS policies
-- ============================================

DROP POLICY IF EXISTS chat_read_receipts_select ON public.chat_read_receipts;
CREATE POLICY chat_read_receipts_select ON public.chat_read_receipts FOR SELECT
    USING (
        user_id = (select auth.uid()) OR 
        (select auth.uid()) IN (SELECT id FROM public.users WHERE role = 'admin')
    );

DROP POLICY IF EXISTS chat_read_receipts_insert ON public.chat_read_receipts;
CREATE POLICY chat_read_receipts_insert ON public.chat_read_receipts FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS chat_read_receipts_update ON public.chat_read_receipts;
CREATE POLICY chat_read_receipts_update ON public.chat_read_receipts FOR UPDATE
    USING (user_id = (select auth.uid()));

-- ============================================
-- PART 5: Fix chat_presence RLS policies
-- ============================================

-- chat_presence_select is fine (uses TRUE, no auth.uid())

DROP POLICY IF EXISTS chat_presence_insert ON public.chat_presence;
CREATE POLICY chat_presence_insert ON public.chat_presence FOR INSERT
    WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS chat_presence_update ON public.chat_presence;
CREATE POLICY chat_presence_update ON public.chat_presence FOR UPDATE
    USING (user_id = (select auth.uid()));

-- ============================================
-- PART 6: Fix disputes RLS policies
-- ============================================

DROP POLICY IF EXISTS "disputes_user_own" ON public.disputes;
CREATE POLICY "disputes_user_own" ON public.disputes
    FOR SELECT USING (
        (select auth.uid()) = reported_by 
        OR (select auth.uid()) = reported_against
    );

DROP POLICY IF EXISTS "disputes_user_create" ON public.disputes;
CREATE POLICY "disputes_user_create" ON public.disputes
    FOR INSERT WITH CHECK ((select auth.uid()) = reported_by);

-- ============================================
-- PART 7: Fix user_warnings RLS policies
-- ============================================

DROP POLICY IF EXISTS "user_warnings_user_own" ON public.user_warnings;
CREATE POLICY "user_warnings_user_own" ON public.user_warnings
    FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================
-- PART 8: Fix any other tables that might have this issue
-- Proactively fixing common tables
-- ============================================

-- Users table (if policies exist)
DO $$
BEGIN
    -- Check and fix users policies if they exist
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public' AND policyname = 'users_select_own') THEN
        DROP POLICY IF EXISTS users_select_own ON public.users;
        CREATE POLICY users_select_own ON public.users FOR SELECT
            USING ((select auth.uid()) = id OR (select auth.uid()) IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin')));
    END IF;
END $$;

-- Lawyers table (if policies exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lawyers' AND schemaname = 'public' AND policyname = 'lawyers_update_own') THEN
        DROP POLICY IF EXISTS lawyers_update_own ON public.lawyers;
        CREATE POLICY lawyers_update_own ON public.lawyers FOR UPDATE
            USING (user_id = (select auth.uid()) OR (select auth.uid()) IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin')));
    END IF;
END $$;

-- Consultations table (if policies exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'consultations' AND schemaname = 'public' AND policyname = 'consultations_select_own') THEN
        DROP POLICY IF EXISTS consultations_select_own ON public.consultations;
        CREATE POLICY consultations_select_own ON public.consultations FOR SELECT
            USING (
                user_id = (select auth.uid()) OR 
                lawyer_id IN (SELECT id FROM public.lawyers WHERE user_id = (select auth.uid())) OR
                (select auth.uid()) IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
            );
    END IF;
END $$;

-- Payments table (if policies exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND schemaname = 'public' AND policyname = 'payments_select_own') THEN
        DROP POLICY IF EXISTS payments_select_own ON public.payments;
        CREATE POLICY payments_select_own ON public.payments FOR SELECT
            USING (
                user_id = (select auth.uid()) OR 
                (select auth.uid()) IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
            );
    END IF;
END $$;

-- Reviews table (if policies exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND schemaname = 'public' AND policyname = 'reviews_insert_own') THEN
        DROP POLICY IF EXISTS reviews_insert_own ON public.reviews;
        CREATE POLICY reviews_insert_own ON public.reviews FOR INSERT
            WITH CHECK (user_id = (select auth.uid()));
    END IF;
END $$;

-- Cases table (if policies exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cases' AND schemaname = 'public' AND policyname = 'cases_select_own') THEN
        DROP POLICY IF EXISTS cases_select_own ON public.cases;
        CREATE POLICY cases_select_own ON public.cases FOR SELECT
            USING (
                user_id = (select auth.uid()) OR 
                lawyer_id IN (SELECT id FROM public.lawyers WHERE user_id = (select auth.uid())) OR
                (select auth.uid()) IN (SELECT id FROM public.users WHERE role IN ('admin', 'super_admin'))
            );
    END IF;
END $$;

-- Notifications table (if policies exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public' AND policyname = 'notifications_select_own') THEN
        DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
        CREATE POLICY notifications_select_own ON public.notifications FOR SELECT
            USING (user_id = (select auth.uid()));
    END IF;
END $$;

-- Reminders table (if policies exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reminders' AND schemaname = 'public' AND policyname = 'reminders_select_own') THEN
        DROP POLICY IF EXISTS reminders_select_own ON public.reminders;
        CREATE POLICY reminders_select_own ON public.reminders FOR SELECT
            USING (user_id = (select auth.uid()));
    END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY chat_rooms_select ON public.chat_rooms IS 'Optimized: Uses (select auth.uid()) for better performance at scale';
COMMENT ON POLICY chat_messages_select ON public.chat_messages IS 'Optimized: Uses (select auth.uid()) for better performance at scale';
COMMENT ON POLICY "disputes_user_own" ON public.disputes IS 'Optimized: Uses (select auth.uid()) for better performance at scale';
COMMENT ON POLICY "user_warnings_user_own" ON public.user_warnings IS 'Optimized: Uses (select auth.uid()) for better performance at scale';

-- ============================================
-- VERIFICATION QUERY
-- Run this after migration to verify policies are using (select auth.uid())
-- ============================================
-- SELECT 
--     schemaname,
--     tablename,
--     policyname,
--     qual,
--     with_check
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
--   AND qual NOT LIKE '%(select auth.uid())%'
--   AND with_check NOT LIKE '%(select auth.uid())%';
--
-- This should return 0 rows if all policies are optimized.
-- ============================================
