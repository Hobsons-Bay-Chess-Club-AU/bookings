-- Create enum for form field types
CREATE TYPE form_field_type AS ENUM (
    'text', 
    'email', 
    'phone', 
    'number', 
    'date', 
    'select', 
    'multiselect', 
    'checkbox', 
    'textarea', 
    'file'
);

-- Create participants table
CREATE TABLE participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Fixed fields (always required)
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    
    -- Dynamic fields stored as JSONB
    custom_data JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add participant_count to bookings table (for validation)
ALTER TABLE bookings ADD COLUMN participant_count INTEGER DEFAULT 1;

-- Add custom form fields to events table
ALTER TABLE events ADD COLUMN custom_form_fields JSONB DEFAULT '[]';

-- Create indexes for performance
CREATE INDEX idx_participants_booking_id ON participants(booking_id);
CREATE INDEX idx_participants_contact_email ON participants(contact_email);
CREATE INDEX idx_participants_custom_data ON participants USING GIN(custom_data);
CREATE INDEX idx_events_form_fields ON events USING GIN(custom_form_fields);

-- Add RLS policies for participants
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view/edit participants for their own bookings
CREATE POLICY "Users can manage participants for their bookings" ON participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = participants.booking_id 
            AND bookings.user_id = auth.uid()
        )
    );

-- Policy: Organizers can view participants for their events
CREATE POLICY "Organizers can view participants for their events" ON participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            JOIN events ON events.id = bookings.event_id
            WHERE bookings.id = participants.booking_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Policy: Admins can view all participants
CREATE POLICY "Admins can view all participants" ON participants
    FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- Add updated_at trigger for participants
CREATE TRIGGER update_participants_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to validate participant count matches booking quantity
CREATE OR REPLACE FUNCTION validate_participant_count()
RETURNS TRIGGER AS $$
DECLARE
    booking_quantity INTEGER;
    current_count INTEGER;
BEGIN
    -- Get the booking quantity
    SELECT quantity INTO booking_quantity
    FROM bookings
    WHERE id = NEW.booking_id;
    
    -- Count current participants for this booking
    SELECT COUNT(*) INTO current_count
    FROM participants
    WHERE booking_id = NEW.booking_id;
    
    -- If this is an insert and we would exceed the quantity, reject
    IF TG_OP = 'INSERT' AND current_count >= booking_quantity THEN
        RAISE EXCEPTION 'Cannot add participant: booking quantity (%) exceeded', booking_quantity;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate participant count
CREATE TRIGGER validate_participant_count_trigger
    BEFORE INSERT ON participants
    FOR EACH ROW
    EXECUTE FUNCTION validate_participant_count();

-- Function to update booking participant count
CREATE OR REPLACE FUNCTION update_booking_participant_count()
RETURNS TRIGGER AS $$
DECLARE
    booking_uuid UUID;
    new_count INTEGER;
BEGIN
    -- Determine which booking to update
    IF TG_OP = 'DELETE' THEN
        booking_uuid := OLD.booking_id;
    ELSE
        booking_uuid := NEW.booking_id;
    END IF;
    
    -- Count participants for this booking
    SELECT COUNT(*) INTO new_count
    FROM participants
    WHERE booking_id = booking_uuid;
    
    -- Update the booking
    UPDATE bookings
    SET participant_count = new_count,
        updated_at = NOW()
    WHERE id = booking_uuid;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add trigger to keep participant count in sync
CREATE TRIGGER update_booking_participant_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION update_booking_participant_count();

-- Function to get event form fields with validation
CREATE OR REPLACE FUNCTION get_event_form_fields(event_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    form_fields JSONB;
BEGIN
    SELECT custom_form_fields INTO form_fields
    FROM events
    WHERE id = event_uuid;
    
    RETURN COALESCE(form_fields, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to validate participant data against form schema
CREATE OR REPLACE FUNCTION validate_participant_data(
    event_uuid UUID,
    participant_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    form_fields JSONB;
    field JSONB;
    field_name TEXT;
    is_required BOOLEAN;
    field_value TEXT;
BEGIN
    -- Get form fields for the event
    form_fields := get_event_form_fields(event_uuid);
    
    -- Validate each required field
    FOR field IN SELECT * FROM jsonb_array_elements(form_fields)
    LOOP
        field_name := field->>'name';
        is_required := COALESCE((field->>'required')::boolean, false);
        field_value := participant_data->>field_name;
        
        -- Check if required field is missing or empty
        IF is_required AND (field_value IS NULL OR field_value = '') THEN
            RAISE EXCEPTION 'Required field % is missing or empty', field_name;
        END IF;
        
        -- Additional validation can be added here (regex, etc.)
    END LOOP;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;