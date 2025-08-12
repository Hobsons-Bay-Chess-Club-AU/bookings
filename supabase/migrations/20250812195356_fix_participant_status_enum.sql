-- Fix participant status enum issue in update_section_seats function
-- The function was incorrectly using booking status values ('confirmed', 'verified') 
-- instead of participant status values ('active', 'whitelisted', 'cancelled')

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS update_section_seats_trigger ON participants;
DROP FUNCTION IF EXISTS update_section_seats();

-- Recreate the function with correct participant status values
CREATE OR REPLACE FUNCTION update_section_seats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND (NEW.status = 'active' OR NEW.status = 'whitelisted') THEN
        -- Update section seats if participant has a section
        IF NEW.section_id IS NOT NULL THEN
            UPDATE event_sections 
            SET current_seats = current_seats + 1
            WHERE id = NEW.section_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes
        IF (OLD.status != 'active' AND OLD.status != 'whitelisted') AND (NEW.status = 'active' OR NEW.status = 'whitelisted') THEN
            -- Participant became active
            IF NEW.section_id IS NOT NULL THEN
                UPDATE event_sections 
                SET current_seats = current_seats + 1
                WHERE id = NEW.section_id;
            END IF;
        ELSIF (OLD.status = 'active' OR OLD.status = 'whitelisted') AND (NEW.status != 'active' AND NEW.status != 'whitelisted') THEN
            -- Participant became inactive
            IF OLD.section_id IS NOT NULL THEN
                UPDATE event_sections 
                SET current_seats = current_seats - 1
                WHERE id = OLD.section_id;
            END IF;
        END IF;
        
        -- Handle section changes
        IF OLD.section_id IS DISTINCT FROM NEW.section_id THEN
            -- Remove from old section
            IF OLD.section_id IS NOT NULL AND (OLD.status = 'active' OR OLD.status = 'whitelisted') THEN
                UPDATE event_sections 
                SET current_seats = current_seats - 1
                WHERE id = OLD.section_id;
            END IF;
            
            -- Add to new section
            IF NEW.section_id IS NOT NULL AND (NEW.status = 'active' OR NEW.status = 'whitelisted') THEN
                UPDATE event_sections 
                SET current_seats = current_seats + 1
                WHERE id = NEW.section_id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' AND (OLD.status = 'active' OR OLD.status = 'whitelisted') THEN
        -- Remove from section
        IF OLD.section_id IS NOT NULL THEN
            UPDATE event_sections 
            SET current_seats = current_seats - 1
            WHERE id = OLD.section_id;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_section_seats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_section_seats();
