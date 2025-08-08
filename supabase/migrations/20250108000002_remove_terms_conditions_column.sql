-- Remove terms_conditions column from events table since it's stored in settings JSONB
-- This reverts the change from 20250107000001_add_event_terms_conditions.sql
ALTER TABLE events DROP COLUMN IF EXISTS terms_conditions;

-- Add comment explaining the change
COMMENT ON COLUMN events.settings IS 'JSONB configuration including terms_conditions and other event settings';
