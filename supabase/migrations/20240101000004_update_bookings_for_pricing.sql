-- Add pricing_id column to bookings table
ALTER TABLE bookings ADD COLUMN pricing_id UUID REFERENCES event_pricing(id);

-- Update the bookings table to store the actual price paid (in case pricing changes)
ALTER TABLE bookings ADD COLUMN unit_price DECIMAL(10, 2);

-- Add index for pricing_id
CREATE INDEX idx_bookings_pricing_id ON bookings(pricing_id);

-- Create trigger to update pricing tickets sold
CREATE TRIGGER trigger_update_pricing_tickets_sold
    AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_pricing_tickets_sold();

-- Add function to calculate total amount based on pricing
CREATE OR REPLACE FUNCTION calculate_booking_total(
    p_pricing_id UUID,
    p_quantity INTEGER
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_unit_price DECIMAL(10, 2);
BEGIN
    SELECT price INTO v_unit_price
    FROM event_pricing
    WHERE id = p_pricing_id;
    
    RETURN v_unit_price * p_quantity;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing bookings to use pricing system
-- Create default pricing entries for existing events
INSERT INTO event_pricing (event_id, name, description, pricing_type, membership_type, price, start_date, end_date)
SELECT 
    id as event_id,
    'Regular Price' as name,
    'Standard ticket price' as description,
    'regular' as pricing_type,
    'all' as membership_type,
    price,
    created_at as start_date,
    COALESCE(start_date, created_at + INTERVAL '1 year') as end_date
FROM events
WHERE NOT EXISTS (
    SELECT 1 FROM event_pricing WHERE event_pricing.event_id = events.id
);

-- Update existing bookings to reference the default pricing
UPDATE bookings 
SET 
    pricing_id = ep.id,
    unit_price = ep.price
FROM event_pricing ep
WHERE bookings.event_id = ep.event_id 
    AND bookings.pricing_id IS NULL
    AND ep.pricing_type = 'regular'
    AND ep.membership_type = 'all';

-- Update existing bookings total_amount to be quantity * unit_price if needed
UPDATE bookings 
SET total_amount = quantity * unit_price
WHERE unit_price IS NOT NULL 
    AND total_amount != quantity * unit_price;