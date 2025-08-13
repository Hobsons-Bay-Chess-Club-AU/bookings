-- Fix section_bookings RLS policies to allow INSERT operations
-- The current policies only allow SELECT, but users need to INSERT when creating bookings

-- Add INSERT policy for users to create section bookings for their own bookings
CREATE POLICY "Users can insert their own section bookings" ON section_bookings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = section_bookings.booking_id 
            AND bookings.user_id = auth.uid()
        )
    );

-- Add INSERT policy for organizers to create section bookings for their events
CREATE POLICY "Organizers can insert section bookings for their events" ON section_bookings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM bookings 
            JOIN events ON events.id = bookings.event_id
            WHERE bookings.id = section_bookings.booking_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Add INSERT policy for admins
CREATE POLICY "Admins can insert all section bookings" ON section_bookings
    FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Add UPDATE policy for users to update their own section bookings
CREATE POLICY "Users can update their own section bookings" ON section_bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE bookings.id = section_bookings.booking_id 
            AND bookings.user_id = auth.uid()
        )
    );

-- Add UPDATE policy for organizers to update section bookings for their events
CREATE POLICY "Organizers can update section bookings for their events" ON section_bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM bookings 
            JOIN events ON events.id = bookings.event_id
            WHERE bookings.id = section_bookings.booking_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Add UPDATE policy for admins
CREATE POLICY "Admins can update all section bookings" ON section_bookings
    FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
