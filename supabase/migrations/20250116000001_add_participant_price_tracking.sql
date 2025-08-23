-- Add price tracking to participants table for partial refunds
-- Migration: Add participant price tracking
-- Created: 2025-01-16

-- Add price_paid column to participants table
ALTER TABLE participants ADD COLUMN price_paid DECIMAL(10,2) DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN participants.price_paid IS 'Amount paid for this specific participant (for partial refund calculations)';

-- Update existing participants with calculated price based on booking total and quantity
UPDATE participants 
SET price_paid = (
    SELECT COALESCE(b.total_amount / NULLIF(b.quantity, 0), 0)
    FROM bookings b 
    WHERE b.id = participants.booking_id
)
WHERE price_paid = 0;

-- Create function to automatically set participant price on insert
CREATE OR REPLACE FUNCTION set_participant_price()
RETURNS TRIGGER AS $$
BEGIN
    -- Set price_paid if not already set
    IF NEW.price_paid = 0 OR NEW.price_paid IS NULL THEN
        SELECT COALESCE(total_amount / NULLIF(quantity, 0), 0)
        INTO NEW.price_paid
        FROM bookings 
        WHERE id = NEW.booking_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set participant price
DROP TRIGGER IF EXISTS set_participant_price_trigger ON participants;
CREATE TRIGGER set_participant_price_trigger
    BEFORE INSERT ON participants
    FOR EACH ROW
    EXECUTE FUNCTION set_participant_price();

-- Create function to handle participant withdrawal
CREATE OR REPLACE FUNCTION withdraw_participant(
    participant_id_param UUID,
    reason_param TEXT DEFAULT NULL,
    performed_by_param UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    participant_record participants%ROWTYPE;
    booking_record bookings%ROWTYPE;
    remaining_participants INTEGER;
    refund_amount DECIMAL(10,2) DEFAULT 0;
    refund_percentage DECIMAL(5,2) DEFAULT 0;
    result JSON;
BEGIN
    -- Get participant details
    SELECT * INTO participant_record 
    FROM participants 
    WHERE id = participant_id_param AND status != 'cancelled';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Participant not found or already cancelled');
    END IF;
    
    -- Get booking details
    SELECT * INTO booking_record 
    FROM bookings 
    WHERE id = participant_record.booking_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Booking not found');
    END IF;
    
    -- Check if booking can be modified
    IF booking_record.status NOT IN ('confirmed', 'verified') THEN
        RETURN json_build_object('success', false, 'error', 'Booking cannot be modified in its current status');
    END IF;
    
    -- Calculate refund if within refund period
    -- This is a simplified calculation - real implementation should use event refund timeline
    refund_amount := participant_record.price_paid;
    refund_percentage := 100; -- Default to full refund, should be calculated based on event timeline
    
    -- Mark participant as cancelled
    UPDATE participants 
    SET 
        status = 'cancelled',
        updated_at = NOW()
    WHERE id = participant_id_param;
    
    -- Check remaining active participants
    SELECT COUNT(*) INTO remaining_participants
    FROM participants 
    WHERE booking_id = participant_record.booking_id AND status != 'cancelled';
    
    -- If no participants remain, cancel the booking
    IF remaining_participants = 0 THEN
        UPDATE bookings 
        SET 
            status = 'cancelled',
            updated_at = NOW()
        WHERE id = participant_record.booking_id;
    ELSE
        -- Update booking totals
        UPDATE bookings 
        SET 
            quantity = remaining_participants,
            total_amount = total_amount - participant_record.price_paid,
            updated_at = NOW()
        WHERE id = participant_record.booking_id;
    END IF;
    
    -- Create audit record
    INSERT INTO booking_audit (
        booking_id,
        event_id,
        action,
        reason,
        notes,
        performed_by,
        performed_at
    ) VALUES (
        participant_record.booking_id,
        booking_record.event_id,
        'participant_withdrawal',
        reason_param,
        'Participant withdrawn: ' || participant_record.first_name || ' ' || participant_record.last_name,
        performed_by_param,
        NOW()
    );
    
    result := json_build_object(
        'success', true,
        'participant_id', participant_id_param,
        'booking_cancelled', remaining_participants = 0,
        'remaining_participants', remaining_participants,
        'refund_amount', refund_amount,
        'refund_percentage', refund_percentage
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION withdraw_participant TO authenticated;
