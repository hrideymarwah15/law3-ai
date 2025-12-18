-- Migration: Add meeting scheduler fields
-- Version: 004
-- Description: Add meeting_link_generated_at and meeting_room_name columns for video consultations

-- Add meeting_link_generated_at to track when meeting links were generated
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS meeting_link_generated_at TIMESTAMPTZ;

-- Add meeting_room_name for Jitsi room names
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS meeting_room_name VARCHAR(100);

-- Add index on scheduled_start for efficient querying of upcoming consultations
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_start 
ON consultations(scheduled_start) 
WHERE status = 'confirmed' AND consultation_type = 'video';

-- Add index for finding consultations needing meeting links
CREATE INDEX IF NOT EXISTS idx_consultations_meeting_pending 
ON consultations(scheduled_start) 
WHERE status = 'confirmed' 
  AND consultation_type IN ('video', 'audio')
  AND meeting_link IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN consultations.meeting_link_generated_at IS 'Timestamp when the meeting link was automatically generated';
COMMENT ON COLUMN consultations.meeting_room_name IS 'Jitsi Meet room name (used for video/audio consultations)';

-- Update meeting_provider default to 'jitsi' if not set
UPDATE consultations 
SET meeting_provider = 'jitsi' 
WHERE meeting_provider IS NULL 
  AND consultation_type IN ('video', 'audio');
