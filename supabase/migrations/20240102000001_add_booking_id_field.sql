-- Add booking_id field to bookings table for short, user-friendly booking identifier
ALTER TABLE bookings ADD COLUMN booking_id VARCHAR(10) UNIQUE;

-- Create function to generate unique booking ID
CREATE OR REPLACE FUNCTION generate_booking_id()
RETURNS VARCHAR(10) AS $$
DECLARE
    new_booking_id VARCHAR(10);
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate a random 7-character alphanumeric string
        new_booking_id := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 7));
        
        -- Check if it already exists
        IF NOT EXISTS (SELECT 1 FROM bookings WHERE booking_id = new_booking_id) THEN
            RETURN new_booking_id;
        END IF;
        
        -- Prevent infinite loop
        counter := counter + 1;
        IF counter > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique booking ID after 100 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set booking_id on insert
CREATE OR REPLACE FUNCTION set_booking_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.booking_id IS NULL THEN
        NEW.booking_id := generate_booking_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_set_booking_id
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION set_booking_id();

-- Create index for better performance
CREATE INDEX idx_bookings_booking_id ON bookings(booking_id);

-- Update existing bookings to have booking_id (if any exist)
UPDATE bookings 
SET booking_id = generate_booking_id() 
WHERE booking_id IS NULL; 