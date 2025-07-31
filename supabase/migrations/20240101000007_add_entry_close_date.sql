-- Add entry_close_date column to events table
ALTER TABLE events 
ADD COLUMN entry_close_date TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN events.entry_close_date IS 'Date and time when entries for this event close. After this date, no new bookings will be accepted.';

-- Update the event_status enum to include 'entry_closed' if not already present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
        CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed', 'entry_closed');
    ELSE
        -- Check if 'entry_closed' already exists in the enum
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'event_status')
            AND enumlabel = 'entry_closed'
        ) THEN
            ALTER TYPE event_status ADD VALUE 'entry_closed';
        END IF;
    END IF;
END $$; 