-- Add attachments column to scheduled_emails table
ALTER TABLE public.scheduled_emails 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Add attachments column to email_logs table
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Update comments
COMMENT ON COLUMN public.scheduled_emails.attachments IS 'Array of attachment objects with filename, content (base64), and contentType';
COMMENT ON COLUMN public.email_logs.attachments IS 'Array of attachment objects with filename, content (base64), and contentType';
