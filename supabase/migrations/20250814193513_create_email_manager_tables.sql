-- Create scheduled_emails table for email scheduling
CREATE TABLE IF NOT EXISTS public.scheduled_emails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipients TEXT[] NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    scheduled_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email_logs table for tracking sent emails
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organizer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipients TEXT[] NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'partial')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_organizer_id ON public.scheduled_emails(organizer_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_date ON public.scheduled_emails(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON public.scheduled_emails(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_organizer_id ON public.email_logs(organizer_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for scheduled_emails
CREATE POLICY "Organizers can view their own scheduled emails" ON public.scheduled_emails
    FOR SELECT USING (
        organizer_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Organizers can create their own scheduled emails" ON public.scheduled_emails
    FOR INSERT WITH CHECK (
        organizer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('organizer', 'admin')
        )
    );

CREATE POLICY "Organizers can update their own scheduled emails" ON public.scheduled_emails
    FOR UPDATE USING (
        organizer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Organizers can delete their own scheduled emails" ON public.scheduled_emails
    FOR DELETE USING (
        organizer_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Create RLS policies for email_logs
CREATE POLICY "Organizers can view their own email logs" ON public.email_logs
    FOR SELECT USING (
        organizer_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Organizers can create their own email logs" ON public.email_logs
    FOR INSERT WITH CHECK (
        organizer_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('organizer', 'admin')
        )
    );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for scheduled_emails
CREATE TRIGGER update_scheduled_emails_updated_at 
    BEFORE UPDATE ON public.scheduled_emails 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.scheduled_emails TO authenticated;
GRANT ALL ON public.email_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
