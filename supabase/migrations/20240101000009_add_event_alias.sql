-- Add alias field to events table for short URLs
ALTER TABLE events 
ADD COLUMN alias VARCHAR(10) UNIQUE;

-- Add comment for documentation
COMMENT ON COLUMN events.alias IS 'Short unique identifier for event URLs (5 random alphanumeric characters)';

-- Create index for faster lookups
CREATE INDEX idx_events_alias ON events(alias);

-- Add constraint to ensure alias is not null for published events
ALTER TABLE events 
ADD CONSTRAINT events_alias_not_null_for_published 
CHECK (status != 'published' OR alias IS NOT NULL); 