-- Migration: Remove 'chat' from consultation_type ENUM
-- Version: 005
-- Description: Remove unused 'chat' consultation type

-- First, update any existing consultations with 'chat' type to 'in_person'
UPDATE consultations 
SET consultation_type = 'in_person' 
WHERE consultation_type = 'chat';

-- In PostgreSQL, removing a value from an ENUM requires recreating the type
-- This is a safe migration that:
-- 1. Drops the default value
-- 2. Creates a new ENUM without 'chat'
-- 3. Updates the column to use the new type
-- 4. Restores the default value
-- 5. Drops the old type

-- Create new enum type
CREATE TYPE consultation_type_new AS ENUM ('video', 'audio', 'in_person');

-- Drop the default value first (required before type change)
ALTER TABLE consultations 
  ALTER COLUMN consultation_type DROP DEFAULT;

-- Update the column to use the new type
ALTER TABLE consultations 
  ALTER COLUMN consultation_type TYPE consultation_type_new 
  USING consultation_type::text::consultation_type_new;

-- Restore the default value with the new type
ALTER TABLE consultations 
  ALTER COLUMN consultation_type SET DEFAULT 'video'::consultation_type_new;

-- Drop the old type
DROP TYPE consultation_type;

-- Rename the new type to the original name
ALTER TYPE consultation_type_new RENAME TO consultation_type;

-- Add comment for documentation
COMMENT ON TYPE consultation_type IS 'Valid consultation types: video (Jitsi Meet), audio (phone call), in_person (office visit)';
