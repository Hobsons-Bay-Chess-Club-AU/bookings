-- Create section_bookings table for multi-section event support
-- This table tracks which sections a booking includes and their quantities/pricing

-- 1. Create section_bookings table
CREATE TABLE section_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    section_id UUID REFERENCES event_sections(id) ON DELETE CASCADE NOT NULL,
    pricing_id UUID REFERENCES section_pricing(id) ON DELETE CASCADE NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX idx_section_bookings_booking_id ON section_bookings(booking_id);
CREATE INDEX idx_section_bookings_section_id ON section_bookings(section_id);
CREATE INDEX idx_section_bookings_pricing_id ON section_bookings(pricing_id);

-- 3. Add RLS policies for section_bookings
ALTER TABLE section_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own section bookings
CREATE POLICY "Users can view their own section bookings" ON section_bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = section_bookings.booking_id 
            AND bookings.user_id = auth.uid()
        )
    );

-- Policy: Organizers can view section bookings for their events
CREATE POLICY "Organizers can view section bookings for their events" ON section_bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            JOIN events ON events.id = bookings.event_id
            WHERE bookings.id = section_bookings.booking_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Policy: Admins can view all section bookings
CREATE POLICY "Admins can view all section bookings" ON section_bookings
    FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- 4. Add trigger for updated_at
CREATE TRIGGER update_section_bookings_updated_at
    BEFORE UPDATE ON section_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Add comment to document the table purpose
COMMENT ON TABLE section_bookings IS 'Tracks which sections are included in each booking for multi-section events';
