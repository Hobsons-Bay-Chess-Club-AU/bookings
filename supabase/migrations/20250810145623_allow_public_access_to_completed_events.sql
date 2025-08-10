-- Update public read policy for events table to include completed events
-- This allows anyone to read published, entry_closed, and completed events

DROP POLICY IF EXISTS "Public can read published events" ON events;

CREATE POLICY "Public can read published events" ON events
FOR SELECT
USING (
  status IN ('published', 'entry_closed', 'completed')
);

-- Add comment for documentation
COMMENT ON POLICY "Public can read published events" ON events IS 'Allows public read access to published, entry_closed, and completed events for short URLs and event listings';
