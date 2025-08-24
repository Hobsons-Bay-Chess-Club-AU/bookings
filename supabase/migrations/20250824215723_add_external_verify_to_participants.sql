-- Add external_verify field to participants table
-- This field helps organizers track which participants have been verified in their external systems
ALTER TABLE participants ADD COLUMN external_verify BOOLEAN DEFAULT FALSE;

-- Add index for better performance when filtering by external_verify status
CREATE INDEX idx_participants_external_verify ON participants(external_verify);

-- Add comment for documentation
COMMENT ON COLUMN participants.external_verify IS 'Flag indicating if participant has been verified in organizer''s external system';
