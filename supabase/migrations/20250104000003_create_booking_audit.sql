-- Create booking_audit table to track booking changes
CREATE TABLE booking_audit (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('transfer', 'refund', 'status_change', 'modification')),
  from_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  to_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  from_status TEXT,
  to_status TEXT,
  reason TEXT,
  notes TEXT,
  performed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_booking_audit_booking_id ON booking_audit(booking_id);
CREATE INDEX idx_booking_audit_event_id ON booking_audit(event_id);
CREATE INDEX idx_booking_audit_action ON booking_audit(action);
CREATE INDEX idx_booking_audit_performed_by ON booking_audit(performed_by);
CREATE INDEX idx_booking_audit_performed_at ON booking_audit(performed_at);

-- Add transfer tracking to bookings table
ALTER TABLE bookings ADD COLUMN transferred_from_event_id UUID REFERENCES events(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN transferred_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN transferred_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for transfer tracking
CREATE INDEX idx_bookings_transferred_from_event_id ON bookings(transferred_from_event_id);

-- Enable RLS on booking_audit table
ALTER TABLE booking_audit ENABLE ROW LEVEL SECURITY;

-- Policy for admins: Full access to all audit records
CREATE POLICY "Admins can manage all booking audit records" ON booking_audit
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy for organizers: Can read audit records for their events
CREATE POLICY "Organizers can read booking audit records for their events" ON booking_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'organizer'
    )
  );

-- Policy for organizers: Can create audit records for their events
CREATE POLICY "Organizers can create booking audit records for their events" ON booking_audit
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'organizer'
    )
  );

-- Policy for customer support: Read access to all audit records
CREATE POLICY "Customer support can read all booking audit records" ON booking_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'customer_support'
    )
  );

-- Policy for customer support: Can create audit records
CREATE POLICY "Customer support can create booking audit records" ON booking_audit
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'customer_support'
    )
  ); 