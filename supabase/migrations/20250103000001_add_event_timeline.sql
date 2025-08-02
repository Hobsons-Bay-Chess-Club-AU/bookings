-- Add timeline field to events table
ALTER TABLE events ADD COLUMN timeline JSONB DEFAULT NULL;

-- Create index for timeline queries
CREATE INDEX idx_events_timeline ON events USING GIN (timeline);

-- Add refund_status to bookings table
ALTER TABLE bookings ADD COLUMN refund_status VARCHAR(20) DEFAULT 'none' CHECK (refund_status IN ('none', 'requested', 'processing', 'completed', 'failed'));
ALTER TABLE bookings ADD COLUMN refund_amount DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN refund_percentage DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN refund_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN refund_processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE bookings ADD COLUMN refund_reason TEXT DEFAULT NULL;

-- Create index for refund queries
CREATE INDEX idx_bookings_refund_status ON bookings (refund_status);
CREATE INDEX idx_bookings_refund_requested_at ON bookings (refund_requested_at);

-- Comment explaining timeline structure
COMMENT ON COLUMN events.timeline IS 'JSONB structure: {"refund": [{"from_date": "2024-01-01T00:00:00Z", "to_date": "2024-01-15T00:00:00Z", "type": "percentage", "value": 100}, {"from_date": "2024-01-15T00:00:00Z", "to_date": "2024-01-30T00:00:00Z", "type": "percentage", "value": 80}, {"from_date": "2024-01-30T00:00:00Z", "to_date": null, "type": "percentage", "value": 0}]}';
