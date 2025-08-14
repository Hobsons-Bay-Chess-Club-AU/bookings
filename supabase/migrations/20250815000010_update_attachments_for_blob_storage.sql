-- Update comments to reflect blob URL storage instead of base64
COMMENT ON COLUMN public.scheduled_emails.attachments IS 'Array of attachment objects with filename, blobUrl, and contentType';
COMMENT ON COLUMN public.email_logs.attachments IS 'Array of attachment objects with filename, blobUrl, and contentType';

-- Note: The existing JSONB columns can store both formats for backward compatibility
-- New format: [{"filename": "doc.pdf", "blobUrl": "https://blob.vercel.com/...", "contentType": "application/pdf"}]
-- Old format: [{"filename": "doc.pdf", "content": "base64data...", "contentType": "application/pdf"}]
