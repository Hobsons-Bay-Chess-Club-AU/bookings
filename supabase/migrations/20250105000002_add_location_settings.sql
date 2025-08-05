-- Add location_settings JSONB field to events table
ALTER TABLE events ADD COLUMN location_settings JSONB DEFAULT '{}'::jsonb;

-- Add comment to document the field structure
COMMENT ON COLUMN events.location_settings IS 'JSONB object containing location-related settings like map_url and direction_url';

-- Create an index for better query performance on location_settings
CREATE INDEX idx_events_location_settings ON events USING GIN (location_settings); 