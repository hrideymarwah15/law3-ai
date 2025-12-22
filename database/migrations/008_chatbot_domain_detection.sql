-- Migration 008: Chatbot Domain Detection Enhancement
-- Adds detected_domain column and index for legal domain tracking in chatbot

-- Add detected_domain column to chatbot_interactions
ALTER TABLE chatbot_interactions 
ADD COLUMN IF NOT EXISTS detected_domain VARCHAR(50);

-- Create index for domain-based analytics
CREATE INDEX IF NOT EXISTS idx_chatbot_domain 
ON chatbot_interactions(detected_domain) 
WHERE detected_domain IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN chatbot_interactions.detected_domain IS 
'Auto-detected legal domain from user query (criminal, family, property, civil, corporate, labour, consumer, tax, constitutional, banking, cyber)';
