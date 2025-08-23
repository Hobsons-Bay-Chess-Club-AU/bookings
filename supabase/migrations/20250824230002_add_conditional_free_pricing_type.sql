-- Add conditional_free to pricing_type enum
ALTER TYPE pricing_type ADD VALUE IF NOT EXISTS 'conditional_free';

-- Add a comment to explain the new pricing type
COMMENT ON TYPE pricing_type IS 'early_bird: early bird pricing, regular: regular pricing, late_bird: late bird pricing, special: special pricing, conditional_free: free entry requiring organizer approval';
