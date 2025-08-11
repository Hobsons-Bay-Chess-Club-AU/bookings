-- Whitelist registration feature

-- 1) Extend booking_status enum with 'whitelisted'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'booking_status' AND e.enumlabel = 'whitelisted'
    ) THEN
        ALTER TYPE booking_status ADD VALUE 'whitelisted';
    END IF;
END
$$;

-- 2) Create participant_status enum and add status column to participants
DO $$
BEGIN
    CREATE TYPE participant_status AS ENUM ('active', 'whitelisted', 'cancelled');
EXCEPTION WHEN duplicate_object THEN
    NULL;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'participants' AND column_name = 'status'
    ) THEN
        ALTER TABLE participants ADD COLUMN status participant_status NOT NULL DEFAULT 'active';
        COMMENT ON COLUMN participants.status IS 'Participant status for whitelist and lifecycle management';
    END IF;
END
$$;

-- 3) Ensure events.settings JSONB has whitelist_enabled key defaulting to false
UPDATE events
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('whitelist_enabled', COALESCE((settings->>'whitelist_enabled')::boolean, false))
WHERE (settings->>'whitelist_enabled') IS NULL;

COMMENT ON COLUMN events.settings IS 'JSON configuration for event display and behavior settings including participant visibility, displayed fields, and whitelist behavior';


