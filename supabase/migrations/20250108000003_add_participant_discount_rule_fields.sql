-- Add missing fields to participant_discount_rules table
-- These fields are needed for the discount form to work properly

ALTER TABLE participant_discount_rules 
ADD COLUMN previous_event_id UUID REFERENCES events(id) ON DELETE CASCADE,
ADD COLUMN min_participants INTEGER DEFAULT 1,
ADD COLUMN max_participants INTEGER,
ADD COLUMN discount_percentage DECIMAL(5,2);

-- Add index for better performance
CREATE INDEX idx_participant_discount_rules_previous_event_id ON participant_discount_rules(previous_event_id);

-- Add comment explaining the new fields
COMMENT ON COLUMN participant_discount_rules.previous_event_id IS 'Reference to a previous event for participant-based discounts';
COMMENT ON COLUMN participant_discount_rules.min_participants IS 'Minimum number of participants required for this discount rule';
COMMENT ON COLUMN participant_discount_rules.max_participants IS 'Maximum number of participants allowed for this discount rule (null for unlimited)';
COMMENT ON COLUMN participant_discount_rules.discount_percentage IS 'Discount percentage for this specific rule (overrides the main discount value)';
