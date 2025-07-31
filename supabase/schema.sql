-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'organizer');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded', 'verified');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- Create profiles table to extend auth.users
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create events table
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_attendees INTEGER,
  current_attendees INTEGER DEFAULT 0,
  status event_status DEFAULT 'draft',
  organizer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_amount DECIMAL(10,2) NOT NULL,
  status booking_status DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- Removed UNIQUE(event_id, user_id) constraint to allow multiple bookings for the same event by the same user
);

-- Create indexes for better performance
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update event attendee count
CREATE OR REPLACE FUNCTION update_event_attendees()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.status = 'confirmed' OR NEW.status = 'verified') THEN
    UPDATE events 
    SET current_attendees = current_attendees + NEW.quantity
    WHERE id = NEW.event_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.status != 'confirmed' AND OLD.status != 'verified') AND (NEW.status = 'confirmed' OR NEW.status = 'verified') THEN
      UPDATE events 
      SET current_attendees = current_attendees + NEW.quantity
      WHERE id = NEW.event_id;
    ELSIF (OLD.status = 'confirmed' OR OLD.status = 'verified') AND (NEW.status != 'confirmed' AND NEW.status != 'verified') THEN
      UPDATE events 
      SET current_attendees = current_attendees - OLD.quantity
      WHERE id = NEW.event_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND (OLD.status = 'confirmed' OR OLD.status = 'verified') THEN
    UPDATE events 
    SET current_attendees = current_attendees - OLD.quantity
    WHERE id = OLD.event_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ language 'plpgsql';

-- Create trigger for attendee count
CREATE TRIGGER update_event_attendees_trigger
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_event_attendees();

-- Helper function to check user role (avoids recursion)
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result FROM profiles WHERE id = user_id;
  RETURN COALESCE(user_role_result, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Profiles policies (FIXED - no recursion)
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow profile creation during signup
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin policies for profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- Events policies
CREATE POLICY "Anyone can view published events" ON events
  FOR SELECT USING (status = 'published');

CREATE POLICY "Organizers can view their own events" ON events
  FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "Admins can view all events" ON events
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Organizers can create events" ON events
  FOR INSERT WITH CHECK (
    organizer_id = auth.uid() AND
    get_user_role(auth.uid()) IN ('organizer', 'admin')
  );

CREATE POLICY "Organizers can update their own events" ON events
  FOR UPDATE USING (
    organizer_id = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Organizers can view bookings for their events" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND organizer_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can create bookings" ON bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own bookings" ON bookings
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND organizer_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) = 'admin'
  );

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();