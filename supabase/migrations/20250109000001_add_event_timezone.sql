-- Add timezone support to events table
-- Default timezone is Australia/Melbourne as requested

-- Add timezone column to events table
ALTER TABLE events 
ADD COLUMN timezone VARCHAR(50) NOT NULL DEFAULT 'Australia/Melbourne';

-- Add comment for documentation
COMMENT ON COLUMN events.timezone IS 'Timezone for the event (IANA timezone identifier)';

-- Create index for timezone queries
CREATE INDEX idx_events_timezone ON events(timezone);

-- Update existing events to use Australia/Melbourne timezone
-- This ensures all existing events have a proper timezone set
UPDATE events 
SET timezone = 'Australia/Melbourne' 
WHERE timezone IS NULL;
