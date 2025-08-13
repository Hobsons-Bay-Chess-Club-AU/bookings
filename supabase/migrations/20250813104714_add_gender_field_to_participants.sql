-- Add gender field to participants table
ALTER TABLE participants ADD COLUMN gender VARCHAR(50);

-- Add index for gender field for better performance in queries
CREATE INDEX idx_participants_gender ON participants(gender);

-- Add comment for documentation
COMMENT ON COLUMN participants.gender IS 'Gender of the participant (optional field)';
