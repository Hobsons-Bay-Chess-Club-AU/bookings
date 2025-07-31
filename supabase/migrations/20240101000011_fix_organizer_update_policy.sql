-- Add policy for organizers to update their own events
-- This allows organizers to update events they created

CREATE POLICY "Organizers can update their own events" ON events
FOR UPDATE
USING (
  organizer_id = auth.uid()
);

-- Add policy for organizers to insert their own events
CREATE POLICY "Organizers can insert their own events" ON events
FOR INSERT
WITH CHECK (
  organizer_id = auth.uid()
);

-- Add policy for organizers to delete their own events
CREATE POLICY "Organizers can delete their own events" ON events
FOR DELETE
USING (
  organizer_id = auth.uid()
);

-- Add policy for organizers to read their own events (including drafts)
CREATE POLICY "Organizers can read their own events" ON events
FOR SELECT
USING (
  organizer_id = auth.uid()
);

-- Add comments for documentation
COMMENT ON POLICY "Organizers can update their own events" ON events IS 'Allows organizers to update events they created';
COMMENT ON POLICY "Organizers can insert their own events" ON events IS 'Allows organizers to create new events';
COMMENT ON POLICY "Organizers can delete their own events" ON events IS 'Allows organizers to delete events they created';
COMMENT ON POLICY "Organizers can read their own events" ON events IS 'Allows organizers to read all their events including drafts'; 