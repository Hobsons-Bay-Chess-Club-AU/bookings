-- Add event_summary field to events table
ALTER TABLE events ADD COLUMN event_summary VARCHAR(200);

-- Add comment for documentation
COMMENT ON COLUMN events.event_summary IS 'Short summary of the event for cards and social sharing (max 200 characters)';

-- Create index for better performance when querying summaries
CREATE INDEX idx_events_summary ON events(event_summary) WHERE event_summary IS NOT NULL;
