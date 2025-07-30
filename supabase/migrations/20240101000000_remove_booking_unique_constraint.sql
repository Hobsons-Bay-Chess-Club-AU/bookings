-- Migration to remove the unique constraint on bookings table
-- This allows users to book the same event multiple times

-- Drop the existing constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_event_id_user_id_key;

-- Note: After applying this migration, users will be able to book the same event multiple times