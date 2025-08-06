-- Create discount types enum
CREATE TYPE discount_type AS ENUM ('code', 'participant_based');
CREATE TYPE discount_value_type AS ENUM ('percentage', 'fixed');

-- Create event_discounts table
CREATE TABLE event_discounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    discount_type discount_type NOT NULL,
    value_type discount_value_type NOT NULL,
    value DECIMAL(10,2) NOT NULL, -- percentage (0-100) or fixed amount
    code TEXT, -- for code-based discounts
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    max_uses INTEGER, -- null for unlimited
    current_uses INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 1, -- minimum quantity required
    max_quantity INTEGER, -- maximum quantity allowed (null for unlimited)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create participant_based_discount_rules table for complex participant matching
CREATE TABLE participant_discount_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    discount_id UUID REFERENCES event_discounts(id) ON DELETE CASCADE NOT NULL,
    rule_type TEXT NOT NULL, -- 'name_match', 'dob_match', 'previous_event', 'custom'
    field_name TEXT, -- for custom field matching
    field_value TEXT, -- value to match against
    operator TEXT DEFAULT 'equals', -- 'equals', 'contains', 'starts_with', 'ends_with'
    related_event_id UUID REFERENCES events(id) ON DELETE CASCADE, -- for previous event checks
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create discount_applications table to track applied discounts
CREATE TABLE discount_applications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    discount_id UUID REFERENCES event_discounts(id) ON DELETE CASCADE NOT NULL,
    applied_value DECIMAL(10,2) NOT NULL, -- actual discount amount applied
    original_amount DECIMAL(10,2) NOT NULL, -- amount before discount
    final_amount DECIMAL(10,2) NOT NULL, -- amount after discount
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_event_discounts_event_id ON event_discounts(event_id);
CREATE INDEX idx_event_discounts_code ON event_discounts(code);
CREATE INDEX idx_event_discounts_active ON event_discounts(is_active);
CREATE INDEX idx_participant_discount_rules_discount_id ON participant_discount_rules(discount_id);
CREATE INDEX idx_discount_applications_booking_id ON discount_applications(booking_id);
CREATE INDEX idx_discount_applications_discount_id ON discount_applications(discount_id);

-- Create trigger for updated_at
CREATE TRIGGER update_event_discounts_updated_at BEFORE UPDATE ON event_discounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discount_applications_updated_at BEFORE UPDATE ON discount_applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check if a participant qualifies for a discount
CREATE OR REPLACE FUNCTION check_participant_discount_eligibility(
    p_discount_id UUID,
    p_first_name TEXT,
    p_last_name TEXT,
    p_date_of_birth DATE,
    p_custom_data JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
    rule_record RECORD;
    matches BOOLEAN := true;
    field_value TEXT;
    custom_value TEXT;
BEGIN
    -- Check each rule for the discount
    FOR rule_record IN 
        SELECT * FROM participant_discount_rules 
        WHERE discount_id = p_discount_id
    LOOP
        CASE rule_record.rule_type
            WHEN 'name_match' THEN
                -- Check if first name and last name match
                IF rule_record.field_name = 'first_name' THEN
                    field_value := p_first_name;
                ELSIF rule_record.field_name = 'last_name' THEN
                    field_value := p_last_name;
                ELSE
                    field_value := NULL;
                END IF;
                
                IF field_value IS NULL OR field_value != rule_record.field_value THEN
                    matches := false;
                END IF;
                
            WHEN 'dob_match' THEN
                -- Check if date of birth matches
                IF p_date_of_birth::TEXT != rule_record.field_value THEN
                    matches := false;
                END IF;
                
            WHEN 'previous_event' THEN
                -- Check if participant has attended a related event
                -- This would need to be implemented based on your booking/participant structure
                -- For now, we'll assume it's always false
                matches := false;
                
            WHEN 'custom' THEN
                -- Check custom field data
                IF p_custom_data IS NOT NULL AND rule_record.field_name IS NOT NULL THEN
                    custom_value := p_custom_data->>rule_record.field_name;
                    
                    CASE rule_record.operator
                        WHEN 'equals' THEN
                            IF custom_value != rule_record.field_value THEN
                                matches := false;
                            END IF;
                        WHEN 'contains' THEN
                            IF custom_value IS NULL OR custom_value NOT LIKE '%' || rule_record.field_value || '%' THEN
                                matches := false;
                            END IF;
                        WHEN 'starts_with' THEN
                            IF custom_value IS NULL OR custom_value NOT LIKE rule_record.field_value || '%' THEN
                                matches := false;
                            END IF;
                        WHEN 'ends_with' THEN
                            IF custom_value IS NULL OR custom_value NOT LIKE '%' || rule_record.field_value THEN
                                matches := false;
                            END IF;
                        ELSE
                            matches := false;
                    END CASE;
                ELSE
                    matches := false;
                END IF;
                
            ELSE
                matches := false;
        END CASE;
        
        -- If any rule doesn't match, the participant is not eligible
        IF NOT matches THEN
            RETURN false;
        END IF;
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate discount amount
CREATE OR REPLACE FUNCTION calculate_discount_amount(
    p_discount_id UUID,
    p_base_amount DECIMAL(10,2),
    p_quantity INTEGER
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    discount_record RECORD;
    discount_amount DECIMAL(10,2) := 0;
BEGIN
    -- Get discount details
    SELECT * INTO discount_record 
    FROM event_discounts 
    WHERE id = p_discount_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Check if discount is within date range
    IF discount_record.start_date IS NOT NULL AND discount_record.start_date > NOW() THEN
        RETURN 0;
    END IF;
    
    IF discount_record.end_date IS NOT NULL AND discount_record.end_date < NOW() THEN
        RETURN 0;
    END IF;
    
    -- Check quantity limits
    IF discount_record.min_quantity IS NOT NULL AND p_quantity < discount_record.min_quantity THEN
        RETURN 0;
    END IF;
    
    IF discount_record.max_quantity IS NOT NULL AND p_quantity > discount_record.max_quantity THEN
        RETURN 0;
    END IF;
    
    -- Check usage limits
    IF discount_record.max_uses IS NOT NULL AND discount_record.current_uses >= discount_record.max_uses THEN
        RETURN 0;
    END IF;
    
    -- Calculate discount amount
    IF discount_record.value_type = 'percentage' THEN
        discount_amount := (p_base_amount * discount_record.value) / 100;
    ELSE
        discount_amount := discount_record.value * p_quantity;
    END IF;
    
    -- Ensure discount doesn't exceed base amount
    IF discount_amount > p_base_amount THEN
        discount_amount := p_base_amount;
    END IF;
    
    RETURN discount_amount;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE event_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_discounts
CREATE POLICY "Anyone can view active discounts for published events" ON event_discounts
    FOR SELECT USING (
        is_active = true AND
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_id AND status = 'published'
        )
    );

CREATE POLICY "Organizers can manage discounts for their events" ON event_discounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE id = event_id AND organizer_id = auth.uid()
        ) OR
        get_user_role(auth.uid()) = 'admin'
    );

-- RLS Policies for participant_discount_rules
CREATE POLICY "Anyone can view discount rules for active discounts" ON participant_discount_rules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_discounts 
            WHERE id = discount_id AND is_active = true
        )
    );

CREATE POLICY "Organizers can manage discount rules for their events" ON participant_discount_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_discounts ed
            JOIN events e ON ed.event_id = e.id
            WHERE ed.id = discount_id AND e.organizer_id = auth.uid()
        ) OR
        get_user_role(auth.uid()) = 'admin'
    );

-- RLS Policies for discount_applications
CREATE POLICY "Users can view their own discount applications" ON discount_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings 
            WHERE id::text = booking_id::text AND user_id = auth.uid()
        )
    );

CREATE POLICY "Organizers can view discount applications for their events" ON discount_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bookings b
            JOIN events e ON b.event_id = e.id
            WHERE b.id::text = booking_id::text AND e.organizer_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all discount applications" ON discount_applications
    FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "System can insert discount applications" ON discount_applications
    FOR INSERT WITH CHECK (true); 