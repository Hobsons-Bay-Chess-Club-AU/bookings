-- Add is_system field to content table
-- Migration: 20250803100001_add_is_system_to_content.sql

-- Add is_system column to content table
ALTER TABLE content ADD COLUMN is_system BOOLEAN DEFAULT false;

-- Create index for is_system field
CREATE INDEX idx_content_is_system ON content(is_system);

-- Update existing privacy policy content to be marked as system content
UPDATE content SET is_system = true WHERE slug IN ('privacy-policy', 'terms-of-service', 'refund-policy');

-- Add comment for documentation
COMMENT ON COLUMN content.is_system IS 'Marks content as system content that cannot be deleted from the UI. System content can only be edited, not deleted.';
