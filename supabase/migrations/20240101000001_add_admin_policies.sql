-- Add admin policies for profiles table to allow admin users to view and update all profiles

-- Policy to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- Policy to allow admins to update all profiles  
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- Policy to allow admins to insert profiles (for user management)
CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) = 'admin');