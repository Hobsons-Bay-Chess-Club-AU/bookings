-- Add is_promoted field to events table
ALTER TABLE events ADD COLUMN is_promoted BOOLEAN DEFAULT FALSE;

-- Create index for better performance when querying promoted events
CREATE INDEX IF NOT EXISTS idx_events_is_promoted ON events(is_promoted);

-- Create composite index for the landing page query (promoted first, then by start_date)
CREATE INDEX IF NOT EXISTS idx_events_promotion_ordering ON events(is_promoted DESC, start_date ASC) WHERE status = 'published';

-- Add comment to document the field
COMMENT ON COLUMN events.is_promoted IS 'Whether this event should be promoted on the landing page';
