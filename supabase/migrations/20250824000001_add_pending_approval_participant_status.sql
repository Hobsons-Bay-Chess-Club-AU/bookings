-- Add pending_approval to participant_status enum
ALTER TYPE participant_status ADD VALUE IF NOT EXISTS 'pending_approval';

-- Add a comment to explain the new status
COMMENT ON TYPE participant_status IS 'active: confirmed participant, whitelisted: on waitlist, cancelled: cancelled, pending_approval: awaiting organizer approval for conditional free entry';
