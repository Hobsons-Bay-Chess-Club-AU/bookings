-- Add event sections support
-- This migration adds optional section support to existing events
-- Most events will remain single-section, but complex events can have multiple sections

-- 1. Add section support to events table
ALTER TABLE events ADD COLUMN has_sections BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN section_settings JSONB DEFAULT '{}';

-- 2. Create event_sections table
CREATE TABLE event_sections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL, -- e.g., "U8 Division", "U12 Division", "Advanced Level"
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    max_seats INTEGER NOT NULL,
    current_seats INTEGER DEFAULT 0,
    status event_status DEFAULT 'draft',
    section_type TEXT, -- e.g., "age_group", "skill_level", "category"
    section_config JSONB DEFAULT '{}', -- Age ranges, skill requirements, etc.
    custom_form_fields JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create section_pricing table
CREATE TABLE section_pricing (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    section_id UUID REFERENCES event_sections(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL, -- e.g., "Early Bird", "Regular", "Member Special"
    description TEXT,
    pricing_type pricing_type NOT NULL DEFAULT 'regular',
    membership_type membership_type NOT NULL DEFAULT 'all',
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    max_tickets INTEGER, -- Optional limit on tickets for this pricing tier
    tickets_sold INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add section_id to participants table (optional - for section assignment)
ALTER TABLE participants ADD COLUMN section_id UUID REFERENCES event_sections(id) ON DELETE SET NULL;

-- 5. Create indexes for performance
CREATE INDEX idx_event_sections_event_id ON event_sections(event_id);
CREATE INDEX idx_event_sections_status ON event_sections(status);
CREATE INDEX idx_event_sections_dates ON event_sections(start_date, end_date);
CREATE INDEX idx_section_pricing_section_id ON section_pricing(section_id);
CREATE INDEX idx_section_pricing_active ON section_pricing(is_active);
CREATE INDEX idx_participants_section_id ON participants(section_id);
CREATE INDEX idx_events_has_sections ON events(has_sections);

-- 6. Add RLS policies for event_sections
ALTER TABLE event_sections ENABLE ROW LEVEL SECURITY;

-- Policy: Organizers can manage sections for their events
CREATE POLICY "Organizers can manage sections for their events" ON event_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_sections.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Policy: Admins can manage all sections
CREATE POLICY "Admins can manage all sections" ON event_sections
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Policy: Public can view published sections
CREATE POLICY "Public can view published sections" ON event_sections
    FOR SELECT USING (status = 'published');

-- 7. Add RLS policies for section_pricing
ALTER TABLE section_pricing ENABLE ROW LEVEL SECURITY;

-- Policy: Organizers can manage pricing for their sections
CREATE POLICY "Organizers can manage pricing for their sections" ON section_pricing
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_sections 
            JOIN events ON events.id = event_sections.event_id
            WHERE event_sections.id = section_pricing.section_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Policy: Admins can manage all pricing
CREATE POLICY "Admins can manage all pricing" ON section_pricing
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Policy: Public can view active pricing
CREATE POLICY "Public can view active pricing" ON section_pricing
    FOR SELECT USING (is_active = true);

-- 8. Add triggers for updated_at
CREATE TRIGGER update_event_sections_updated_at
    BEFORE UPDATE ON event_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_section_pricing_updated_at
    BEFORE UPDATE ON section_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Function to update section seat count when bookings change
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

-- 10. Add trigger to update section seats
CREATE TRIGGER update_section_seats_trigger
    AFTER INSERT OR UPDATE OR DELETE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_section_seats();

-- 11. Function to get available seats for a section
CREATE OR REPLACE FUNCTION get_section_available_seats(section_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    max_seats_val INTEGER;
    current_seats_val INTEGER;
BEGIN
    SELECT max_seats, current_seats INTO max_seats_val, current_seats_val
    FROM event_sections
    WHERE id = section_uuid;
    
    RETURN COALESCE(max_seats_val, 0) - COALESCE(current_seats_val, 0);
END;
$$ LANGUAGE plpgsql;

-- 12. Function to check if section has available seats
CREATE OR REPLACE FUNCTION section_has_available_seats(section_uuid UUID, required_seats INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_section_available_seats(section_uuid) >= required_seats;
END;
$$ LANGUAGE plpgsql;

-- 13. Function to transfer participants between sections
CREATE OR REPLACE FUNCTION transfer_participants_between_sections(transfer_data JSONB)
RETURNS VOID AS $$
DECLARE
    transfer_record RECORD;
    from_section_id UUID;
    to_section_id UUID;
    participant_id UUID;
BEGIN
    -- Loop through each transfer
    FOR transfer_record IN SELECT * FROM jsonb_array_elements(transfer_data)
    LOOP
        from_section_id := (transfer_record.value->>'fromSectionId')::UUID;
        to_section_id := (transfer_record.value->>'toSectionId')::UUID;
        participant_id := (transfer_record.value->>'participantId')::UUID;
        
        -- Update participant's section_id
        UPDATE participants 
        SET section_id = to_section_id 
        WHERE id = participant_id;
        
        -- Decrease current_seats in from_section
        UPDATE event_sections 
        SET current_seats = current_seats - 1 
        WHERE id = from_section_id;
        
        -- Increase current_seats in to_section
        UPDATE event_sections 
        SET current_seats = current_seats + 1 
        WHERE id = to_section_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
