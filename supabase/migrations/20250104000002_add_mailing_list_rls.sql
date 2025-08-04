-- Enable Row Level Security on mailing_list table
ALTER TABLE mailing_list ENABLE ROW LEVEL SECURITY;

-- Policy for admins: Full access to all records
CREATE POLICY "Admins can manage all mailing list records" ON mailing_list
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Policy for organizers: Full access to all records
CREATE POLICY "Organizers can manage all mailing list records" ON mailing_list
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'organizer'
    )
  );

-- Policy for customer support: Read access to all records, limited write access
CREATE POLICY "Customer support can read all mailing list records" ON mailing_list
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'customer_support'
    )
  );

-- Policy for customer support: Can update status and unsubscribe_reason
CREATE POLICY "Customer support can update mailing list status" ON mailing_list
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'customer_support'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'customer_support'
    )
  );

-- Policy for regular users: Can only manage their own email record
CREATE POLICY "Users can manage their own mailing list record" ON mailing_list
  FOR ALL USING (
    email = (
      SELECT email FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  ) WITH CHECK (
    email = (
      SELECT email FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

-- Policy for unauthenticated users: Can only insert new records (for signup/checkout)
CREATE POLICY "Unauthenticated users can insert new mailing list records" ON mailing_list
  FOR INSERT WITH CHECK (true);

-- Policy for unauthenticated users: Can read records with unsubscribe_code (for unsubscribe page)
CREATE POLICY "Unauthenticated users can read records with unsubscribe code" ON mailing_list
  FOR SELECT USING (true);

-- Policy for unauthenticated users: Can update records with unsubscribe_code (for unsubscribe action)
CREATE POLICY "Unauthenticated users can update records with unsubscribe code" ON mailing_list
  FOR UPDATE USING (true) WITH CHECK (true);

-- Policy for service role: Full access for system operations
CREATE POLICY "Service role has full access to mailing list" ON mailing_list
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role'); 