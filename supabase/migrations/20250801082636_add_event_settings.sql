-- Add settings field to events table for configurable options
ALTER TABLE events ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;

-- Add index for settings queries
CREATE INDEX idx_events_settings ON events USING GIN (settings);

-- Update existing events to have default settings
UPDATE events SET settings = '{
  "show_participants_public": false,
  "participant_display_fields": ["first_name", "last_name"],
  "show_attendance_count": false,
  "allow_participant_contact": false
}'::jsonb WHERE settings IS NULL OR settings = '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN events.settings IS 'JSON configuration for event display and behavior settings including participant visibility and displayed fields';