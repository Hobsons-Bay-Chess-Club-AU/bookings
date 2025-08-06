-- Add seat-based discount type to the existing enum
ALTER TYPE discount_type ADD VALUE 'seat_based';

-- Add seat discount rules table
CREATE TABLE seat_discount_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    discount_id UUID REFERENCES event_discounts(id) ON DELETE CASCADE NOT NULL,
    min_seats INTEGER NOT NULL, -- minimum number of seats required
    max_seats INTEGER, -- maximum number of seats (null for unlimited)
    discount_amount DECIMAL(10,2) NOT NULL, -- discount amount for this seat range
    discount_percentage DECIMAL(5,2), -- discount percentage (alternative to fixed amount)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_seat_discount_rules_discount_id ON seat_discount_rules(discount_id);
CREATE INDEX idx_seat_discount_rules_min_seats ON seat_discount_rules(min_seats);

-- Create trigger for updated_at
CREATE TRIGGER update_seat_discount_rules_updated_at BEFORE UPDATE ON seat_discount_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE seat_discount_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seat_discount_rules
CREATE POLICY "Anyone can view seat discount rules for active discounts" ON seat_discount_rules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_discounts
            WHERE id = discount_id AND is_active = true
        )
    );

CREATE POLICY "Organizers can manage seat discount rules for their events" ON seat_discount_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_discounts ed
            JOIN events e ON ed.event_id = e.id
            WHERE ed.id = discount_id AND e.organizer_id = auth.uid()
        ) OR
        get_user_role(auth.uid()) = 'admin'
    );

-- Function to calculate seat-based discount
CREATE OR REPLACE FUNCTION calculate_seat_based_discount(
    p_discount_id UUID,
    p_quantity INTEGER
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    rule_record RECORD;
    best_discount DECIMAL(10,2) := 0;
    discount_amount DECIMAL(10,2);
BEGIN
    -- Find the best applicable seat discount rule
    FOR rule_record IN
        SELECT * FROM seat_discount_rules
        WHERE discount_id = p_discount_id
        AND min_seats <= p_quantity
        AND (max_seats IS NULL OR max_seats >= p_quantity)
        ORDER BY min_seats DESC
        LIMIT 1
    LOOP
        -- Calculate discount amount
        IF rule_record.discount_percentage IS NOT NULL THEN
            -- Percentage-based discount
            discount_amount := (p_quantity * rule_record.discount_percentage) / 100;
        ELSE
            -- Fixed amount discount
            discount_amount := rule_record.discount_amount;
        END IF;
        
        best_discount := discount_amount;
        EXIT; -- Take the first (best) matching rule
    END LOOP;

    RETURN best_discount;
END;
$$ LANGUAGE plpgsql;

-- Update the existing calculate_discount_amount function to handle seat-based discounts
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

    -- Calculate discount amount based on type
    CASE discount_record.discount_type
        WHEN 'percentage' THEN
            discount_amount := (p_base_amount * discount_record.value) / 100;
        WHEN 'fixed' THEN
            discount_amount := discount_record.value * p_quantity;
        WHEN 'seat_based' THEN
            discount_amount := calculate_seat_based_discount(p_discount_id, p_quantity);
        ELSE
            discount_amount := 0;
    END CASE;

    -- Ensure discount doesn't exceed base amount
    IF discount_amount > p_base_amount THEN
        discount_amount := p_base_amount;
    END IF;

    RETURN discount_amount;
END;
$$ LANGUAGE plpgsql; 