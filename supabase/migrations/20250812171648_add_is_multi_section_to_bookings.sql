-- Add is_multi_section column to bookings table
-- This column tracks whether a booking is for a multi-section event
-- This is needed for proper handling of multi-section bookings in the payment flow

ALTER TABLE bookings ADD COLUMN is_multi_section BOOLEAN DEFAULT false;

-- Add index for better performance when querying multi-section bookings
CREATE INDEX idx_bookings_is_multi_section ON bookings(is_multi_section);

-- Add comment to document the column purpose
COMMENT ON COLUMN bookings.is_multi_section IS 'Indicates whether this booking is for a multi-section event';
