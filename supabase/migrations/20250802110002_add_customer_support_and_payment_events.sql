-- Create payment_events table
CREATE TABLE payment_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    stripe_event_type VARCHAR(100) NOT NULL,
    stripe_event_id VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_payment_events_booking_id ON payment_events(booking_id);
CREATE INDEX idx_payment_events_stripe_event_id ON payment_events(stripe_event_id);
CREATE INDEX idx_payment_events_created_at ON payment_events(created_at);
CREATE INDEX idx_payment_events_event_type ON payment_events(stripe_event_type);

-- Add RLS policies
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Admin and customer support can view all payment events
CREATE POLICY "Admin and customer support can view all payment events" ON payment_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'customer_support')
        )
    );

-- Only admin can insert/update/delete payment events (via service role from webhooks)
CREATE POLICY "Service role can manage payment events" ON payment_events
    FOR ALL USING (auth.role() = 'service_role');

-- Add automatic cleanup function for old payment events
CREATE OR REPLACE FUNCTION cleanup_old_payment_events()
RETURNS void AS $$
DECLARE
    retention_days INTEGER := COALESCE(
        (SELECT value::INTEGER FROM app_settings WHERE key = 'payment_events_retention_days'),
        90  -- Default to 90 days if not configured
    );
BEGIN
    DELETE FROM payment_events 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    RAISE LOG 'Cleaned up payment events older than % days', retention_days;
END;
$$ LANGUAGE plpgsql;

-- Create app_settings table if it doesn't exist (for configuration)
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default retention setting
INSERT INTO app_settings (key, value, description) 
VALUES ('payment_events_retention_days', '90', 'Number of days to retain payment events before automatic cleanup')
ON CONFLICT (key) DO NOTHING;

-- Create a scheduled job to run cleanup daily (requires pg_cron extension)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-payment-events', '0 2 * * *', 'SELECT cleanup_old_payment_events();');

-- Add comment to the table
COMMENT ON TABLE payment_events IS 'Stores payment-related events from Stripe webhooks for customer support and debugging';
COMMENT ON COLUMN payment_events.booking_id IS 'Reference to the booking this payment event relates to';
COMMENT ON COLUMN payment_events.stripe_event_type IS 'Type of Stripe event (e.g., payment_intent.succeeded)';
COMMENT ON COLUMN payment_events.stripe_event_id IS 'Unique Stripe event ID for retrieving full event data via API';
