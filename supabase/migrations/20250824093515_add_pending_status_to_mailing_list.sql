-- Add pending status to mailing_list table
ALTER TYPE mailing_list_status ADD VALUE IF NOT EXISTS 'pending';

-- Add confirmation_token column to mailing_list for secure confirmations
ALTER TABLE mailing_list ADD COLUMN confirmation_token UUID DEFAULT gen_random_uuid();

-- Add index for confirmation token
CREATE INDEX idx_mailing_list_confirmation_token ON mailing_list(confirmation_token);

-- Add comment explaining the new status
COMMENT ON TYPE mailing_list_status IS 'subscribed: active subscription, unsubscribed: opted out, pending: awaiting email confirmation';

-- Add comment for confirmation token
COMMENT ON COLUMN mailing_list.confirmation_token IS 'Token used for email confirmation links, only set for pending subscriptions';
