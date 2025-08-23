-- Update booking_audit table to include missing action values
-- Add 'participant_withdrawal' to the allowed actions

-- Drop the existing check constraint
ALTER TABLE booking_audit DROP CONSTRAINT IF EXISTS booking_audit_action_check;

-- Add the new check constraint with additional action values
ALTER TABLE booking_audit ADD CONSTRAINT booking_audit_action_check 
    CHECK (action IN (
        'transfer', 
        'refund', 
        'status_change', 
        'modification',
        'participant_withdrawal',
        'participant_edit'
    ));
