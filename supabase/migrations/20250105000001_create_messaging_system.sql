-- Create messaging system tables
-- This migration adds tables for user-organizer communication

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_organizer_reply BOOLEAN DEFAULT FALSE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversations table to group related messages
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  subject TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organizer_id, event_id)
);

-- Create indexes for better performance
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_organizer_id ON conversations(organizer_id);
CREATE INDEX idx_conversations_event_id ON conversations(event_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);

-- Create triggers for updated_at
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation's last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update conversation timestamp when new message is added
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_uuid UUID, reader_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE messages 
  SET is_read = TRUE 
  WHERE conversation_id = conversation_uuid 
    AND recipient_id = reader_id 
    AND is_read = FALSE;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Enable RLS on new tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view messages they sent or received" ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR 
    recipient_id = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Users can update messages they received" ON messages
  FOR UPDATE USING (
    recipient_id = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

-- RLS Policies for conversations
CREATE POLICY "Users can view conversations they're part of" ON conversations
  FOR SELECT USING (
    user_id = auth.uid() OR 
    organizer_id = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

CREATE POLICY "Users can update conversations they're part of" ON conversations
  FOR UPDATE USING (
    user_id = auth.uid() OR 
    organizer_id = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION get_unread_message_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  count_result INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_result
  FROM messages 
  WHERE recipient_id = user_uuid AND is_read = FALSE;
  
  RETURN count_result;
END;
$$ language 'plpgsql' SECURITY DEFINER; 