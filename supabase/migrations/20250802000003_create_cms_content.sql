-- Create content management system tables
-- Migration: 20250802000003_create_cms_content.sql

-- Create content table for CMS
CREATE TABLE content (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  body TEXT NOT NULL, -- Markdown content
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT false,
  meta_description TEXT,
  meta_keywords TEXT[],
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content history table for versioning
CREATE TABLE content_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content_id UUID REFERENCES content(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_content_slug ON content(slug);
CREATE INDEX idx_content_published ON content(is_published);
CREATE INDEX idx_content_created_at ON content(created_at);
CREATE INDEX idx_content_history_content_id ON content_history(content_id);
CREATE INDEX idx_content_history_version ON content_history(content_id, version);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for content table
CREATE TRIGGER update_content_updated_at 
    BEFORE UPDATE ON content 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to auto-increment version and save history
CREATE OR REPLACE FUNCTION save_content_history()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an update (not insert)
    IF TG_OP = 'UPDATE' THEN
        -- Save the old version to history
        INSERT INTO content_history (content_id, title, body, version, created_by)
        VALUES (OLD.id, OLD.title, OLD.body, OLD.version, OLD.updated_by);
        
        -- Increment version for the new record
        NEW.version = OLD.version + 1;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to save history before updates
CREATE TRIGGER save_content_history_trigger
    BEFORE UPDATE ON content
    FOR EACH ROW
    EXECUTE FUNCTION save_content_history();

-- Row Level Security (RLS) policies

-- Enable RLS
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_history ENABLE ROW LEVEL SECURITY;

-- Content policies
-- Allow everyone to read published content
CREATE POLICY "Anyone can read published content" ON content
    FOR SELECT USING (is_published = true);

-- Only admins can manage content
CREATE POLICY "Admins can manage all content" ON content
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Content history policies
-- Only admins can read content history
CREATE POLICY "Admins can read content history" ON content_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Insert some default content
INSERT INTO content (title, slug, body, is_published, created_by, updated_by) VALUES
('About Us', 'about-us', '# About Hobsons Bay Chess Club

Welcome to the Hobsons Bay Chess Club, where strategy meets community!

## Our Mission

We are dedicated to promoting the game of chess within the Hobsons Bay community and providing a welcoming environment for players of all skill levels.

## What We Offer

- Weekly tournaments and casual games
- Chess lessons for beginners
- Advanced coaching for competitive players
- Community events and social gatherings
- Online booking system for events

## Join Us

Whether you''re a complete beginner or a seasoned grandmaster, we welcome you to join our community and discover the joy of chess.
', true, NULL, NULL),

('Terms of Service', 'terms-of-service', '# Terms of Service

**Last updated:** August 2, 2025

## Acceptance of Terms

By accessing and using the Hobsons Bay Chess Club booking platform, you accept and agree to be bound by the terms and provision of this agreement.

## Use License

Permission is granted to temporarily download one copy of the materials on our website for personal, non-commercial transitory viewing only.

## Disclaimer

The materials on our website are provided on an ''as is'' basis. Hobsons Bay Chess Club makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.

## Limitations

In no event shall Hobsons Bay Chess Club or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our website.

## Contact Information

If you have any questions about these Terms of Service, please contact us at:
- Email: info@hobsonsbaycc.com.au
- Phone: (03) 1234 5678
', true, NULL, NULL),

('Contact Us', 'contact', '# Contact Us

Get in touch with the Hobsons Bay Chess Club team.

## Contact Information

**Email:** info@hobsonsbaycc.com.au  
**Phone:** (03) 1234 5678  
**Address:** Community Center, Hobsons Bay, Victoria, Australia

## Office Hours

- **Monday - Friday:** 9:00 AM - 5:00 PM
- **Saturday:** 10:00 AM - 4:00 PM
- **Sunday:** Closed

## Quick Links

- [Book an Event](/events)
- [Privacy Policy](/privacy-policy)
- [Terms of Service](/terms-of-service)

## Follow Us

Stay updated with our latest news and events by following us on social media.
', true, NULL, NULL);
