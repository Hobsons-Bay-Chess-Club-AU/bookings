-- Add terms_conditions field to events table
ALTER TABLE events ADD COLUMN terms_conditions TEXT;

-- Add comment for documentation
COMMENT ON COLUMN events.terms_conditions IS 'Terms and conditions for the event that participants must accept'; 