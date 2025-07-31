-- Add organizer contact information fields to events table
ALTER TABLE events 
ADD COLUMN organizer_name VARCHAR(255),
ADD COLUMN organizer_email VARCHAR(255),
ADD COLUMN organizer_phone VARCHAR(50);

-- Add comments for documentation
COMMENT ON COLUMN events.organizer_name IS 'Organizer name for this specific event (overrides profile name)';
COMMENT ON COLUMN events.organizer_email IS 'Organizer email for this specific event (overrides profile email)';
COMMENT ON COLUMN events.organizer_phone IS 'Organizer phone for this specific event (overrides profile phone)';

-- Update existing events to use organizer profile information as default
UPDATE events 
SET 
    organizer_name = profiles.full_name,
    organizer_email = profiles.email
FROM profiles 
WHERE events.organizer_id = profiles.id 
AND events.organizer_name IS NULL; 