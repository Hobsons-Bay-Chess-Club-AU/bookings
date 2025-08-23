-- Add middle_name field to participants table
ALTER TABLE participants ADD COLUMN middle_name VARCHAR(255);

-- Add comment to explain the new field
COMMENT ON COLUMN participants.middle_name IS 'Optional middle name for participants';
