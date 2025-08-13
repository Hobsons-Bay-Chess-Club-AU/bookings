-- Section-level whitelist feature
-- This migration adds whitelist support to individual sections

-- 1. Add whitelist settings to event_sections table
ALTER TABLE event_sections ADD COLUMN whitelist_enabled BOOLEAN DEFAULT false;
ALTER TABLE event_sections ADD COLUMN whitelist_settings JSONB DEFAULT '{}';

-- Add comment to document the new columns
COMMENT ON COLUMN event_sections.whitelist_enabled IS 'Whether whitelist is enabled for this section when full';
COMMENT ON COLUMN event_sections.whitelist_settings IS 'JSON configuration for section whitelist behavior';

-- 2. Add whitelist status to section_bookings table
ALTER TABLE section_bookings ADD COLUMN status booking_status DEFAULT 'pending';
ALTER TABLE section_bookings ADD COLUMN whitelist_reason TEXT;

-- Add comment to document the new columns
COMMENT ON COLUMN section_bookings.status IS 'Status of this section booking (pending, confirmed, whitelisted, etc.)';
COMMENT ON COLUMN section_bookings.whitelist_reason IS 'Reason for whitelist status if applicable';

-- 3. Update section_bookings table to track whitelist information
ALTER TABLE section_bookings ADD COLUMN is_whitelisted BOOLEAN DEFAULT false;
ALTER TABLE section_bookings ADD COLUMN whitelisted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE section_bookings ADD COLUMN released_from_whitelist_at TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN section_bookings.is_whitelisted IS 'Whether this section booking was placed on whitelist';
COMMENT ON COLUMN section_bookings.whitelisted_at IS 'When this section booking was placed on whitelist';
COMMENT ON COLUMN section_bookings.released_from_whitelist_at IS 'When this section booking was released from whitelist';

-- 4. Create indexes for better performance
CREATE INDEX idx_section_bookings_status ON section_bookings(status);
CREATE INDEX idx_section_bookings_is_whitelisted ON section_bookings(is_whitelisted);
CREATE INDEX idx_event_sections_whitelist_enabled ON event_sections(whitelist_enabled);

-- 5. Add trigger to automatically update whitelist status when section becomes full
CREATE OR REPLACE FUNCTION update_section_whitelist_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if section is full and whitelist is enabled
    IF NEW.current_seats >= NEW.max_seats AND NEW.whitelist_enabled = true THEN
        -- Update any pending section_bookings to whitelisted status
        UPDATE section_bookings 
        SET 
            status = 'whitelisted',
            is_whitelisted = true,
            whitelisted_at = NOW(),
            whitelist_reason = 'Section is full and whitelist is enabled'
        WHERE 
            section_id = NEW.id 
            AND status = 'pending'
            AND is_whitelisted = false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on event_sections table
CREATE TRIGGER trigger_update_section_whitelist_status
    AFTER UPDATE OF current_seats ON event_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_section_whitelist_status();

-- 6. Add function to check if a section should be whitelisted
CREATE OR REPLACE FUNCTION should_section_be_whitelisted(section_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    section_record RECORD;
BEGIN
    SELECT current_seats, max_seats, whitelist_enabled 
    INTO section_record 
    FROM event_sections 
    WHERE id = section_uuid;
    
    RETURN section_record.whitelist_enabled = true AND section_record.current_seats >= section_record.max_seats;
END;
$$ LANGUAGE plpgsql;

-- 7. Add function to get section whitelist status
CREATE OR REPLACE FUNCTION get_section_whitelist_status(section_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'is_full', current_seats >= max_seats,
        'whitelist_enabled', whitelist_enabled,
        'should_whitelist', should_section_be_whitelisted(section_uuid),
        'available_seats', GREATEST(0, max_seats - current_seats),
        'current_seats', current_seats,
        'max_seats', max_seats
    ) INTO result
    FROM event_sections
    WHERE id = section_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
