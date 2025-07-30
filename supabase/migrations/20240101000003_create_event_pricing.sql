-- Create enum for membership types
CREATE TYPE membership_type AS ENUM ('member', 'non_member', 'all');

-- Create enum for pricing types
CREATE TYPE pricing_type AS ENUM ('early_bird', 'regular', 'late_bird', 'special');

-- Create event_pricing table
CREATE TABLE event_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- e.g., "Early Bird", "Regular", "Member Special"
    description TEXT, -- Optional description of the pricing tier
    pricing_type pricing_type NOT NULL DEFAULT 'regular',
    membership_type membership_type NOT NULL DEFAULT 'all',
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    max_tickets INTEGER, -- Optional limit on tickets for this pricing tier
    tickets_sold INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    CONSTRAINT valid_ticket_limit CHECK (max_tickets IS NULL OR max_tickets > 0),
    CONSTRAINT valid_tickets_sold CHECK (tickets_sold >= 0 AND (max_tickets IS NULL OR tickets_sold <= max_tickets))
);

-- Create indexes for performance
CREATE INDEX idx_event_pricing_event_id ON event_pricing(event_id);
CREATE INDEX idx_event_pricing_dates ON event_pricing(start_date, end_date);
CREATE INDEX idx_event_pricing_active ON event_pricing(is_active);
CREATE INDEX idx_event_pricing_membership ON event_pricing(membership_type);

-- Add function to get current price for an event based on membership
CREATE OR REPLACE FUNCTION get_current_event_pricing(
    p_event_id UUID,
    p_membership_type membership_type DEFAULT 'all',
    p_booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    pricing_id UUID,
    name VARCHAR(255),
    description TEXT,
    pricing_type pricing_type,
    membership_type membership_type,
    price DECIMAL(10, 2),
    available_tickets INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ep.id,
        ep.name,
        ep.description,
        ep.pricing_type,
        ep.membership_type,
        ep.price,
        CASE 
            WHEN ep.max_tickets IS NULL THEN NULL
            ELSE ep.max_tickets - ep.tickets_sold
        END as available_tickets
    FROM event_pricing ep
    WHERE ep.event_id = p_event_id
        AND ep.is_active = true
        AND ep.start_date <= p_booking_date
        AND ep.end_date >= p_booking_date
        AND (ep.membership_type = p_membership_type OR ep.membership_type = 'all')
        AND (ep.max_tickets IS NULL OR ep.tickets_sold < ep.max_tickets)
    ORDER BY ep.price ASC, ep.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Add function to update tickets sold when booking is made
CREATE OR REPLACE FUNCTION update_pricing_tickets_sold()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        -- Increase tickets sold for the pricing tier
        UPDATE event_pricing 
        SET tickets_sold = tickets_sold + NEW.quantity,
            updated_at = NOW()
        WHERE id = NEW.pricing_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes
        IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
            -- Booking confirmed, increase tickets sold
            UPDATE event_pricing 
            SET tickets_sold = tickets_sold + NEW.quantity,
                updated_at = NOW()
            WHERE id = NEW.pricing_id;
        ELSIF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
            -- Booking cancelled/refunded, decrease tickets sold
            UPDATE event_pricing 
            SET tickets_sold = tickets_sold - OLD.quantity,
                updated_at = NOW()
            WHERE id = OLD.pricing_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
        -- Booking deleted, decrease tickets sold
        UPDATE event_pricing 
        SET tickets_sold = tickets_sold - OLD.quantity,
            updated_at = NOW()
        WHERE id = OLD.pricing_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for event_pricing
ALTER TABLE event_pricing ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view pricing for published events
CREATE POLICY "Users can view event pricing" ON event_pricing
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_pricing.event_id 
            AND events.status = 'published'
        )
    );

-- Policy: Organizers can manage pricing for their events
CREATE POLICY "Organizers can manage their event pricing" ON event_pricing
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_pricing.event_id 
            AND events.organizer_id = auth.uid()
        )
    );

-- Policy: Admins can manage all pricing
CREATE POLICY "Admins can manage all event pricing" ON event_pricing
    FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Add updated_at trigger
CREATE TRIGGER update_event_pricing_updated_at
    BEFORE UPDATE ON event_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add membership_type column to profiles table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'membership_type'
    ) THEN
        ALTER TABLE profiles ADD COLUMN membership_type membership_type DEFAULT 'non_member';
        CREATE INDEX idx_profiles_membership_type ON profiles(membership_type);
    END IF;
END $$;