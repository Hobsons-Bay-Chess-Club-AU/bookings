-- Create mailing_list table
CREATE TABLE mailing_list (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  unsubscribe_reason TEXT,
  status TEXT DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  datetime TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  filter_event TEXT[] DEFAULT ARRAY['all'],
  unsubscribe_code UUID DEFAULT uuid_generate_v4() UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_mailing_list_email ON mailing_list(email);
CREATE INDEX idx_mailing_list_status ON mailing_list(status);
CREATE INDEX idx_mailing_list_unsubscribe_code ON mailing_list(unsubscribe_code);

-- Create trigger for updated_at
CREATE TRIGGER update_mailing_list_updated_at BEFORE UPDATE ON mailing_list
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 