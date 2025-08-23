-- Add pending_approval status to booking_status enum
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'pending_approval';

-- Add a comment to explain the new status
COMMENT ON TYPE booking_status IS 'pending: awaiting payment, confirmed: paid and confirmed, verified: attendance verified, cancelled: cancelled, whitelisted: on waitlist, pending_approval: awaiting organizer approval for conditional free entry';
