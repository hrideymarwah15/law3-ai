-- ============================================
-- Migration 009: User Auth Trigger
-- Creates automatic user profile in public.users
-- when a user signs up via Supabase Auth
-- ============================================

-- Function to handle new user creation from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
    'user'::user_role,
    'active'::user_status,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ============================================
-- Function to sync existing auth users to public.users
-- Run this once to fix any users that were created before the trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.sync_existing_auth_users()
RETURNS INTEGER AS $$
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
      'user'::user_role,
      'active'::user_status,
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.sync_existing_auth_users() TO service_role;

-- Comment explaining usage
COMMENT ON FUNCTION public.sync_existing_auth_users() IS 
'Syncs existing auth.users to public.users table. Run this once after adding trigger: SELECT sync_existing_auth_users();';
