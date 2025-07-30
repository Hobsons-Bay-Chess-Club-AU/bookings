-- Test Users Setup Script
-- Run this script after setting up the main schema to create test users for development

-- Note: In a real Supabase setup, users are created through the auth.users table
-- This script provides the SQL to manually insert test users and their profiles
-- You would typically create these users through the Supabase Auth UI or API

-- First, you need to create users in the Supabase Auth dashboard or via API
-- Then run this script to set up their profiles with appropriate roles

-- Test User 1: Admin User
-- Email: admin@eventbooking.com
-- Password: admin123
-- After creating this user in Supabase Auth, get their UUID and replace 'admin-user-uuid-here'
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'admin-user-uuid-here', -- Replace with actual UUID from auth.users
  'admin@eventbooking.com',
  'Admin User',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  full_name = 'Admin User',
  updated_at = NOW();

-- Test User 2: Organizer User
-- Email: organizer@eventbooking.com
-- Password: organizer123
-- After creating this user in Supabase Auth, get their UUID and replace 'organizer-user-uuid-here'
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'organizer-user-uuid-here', -- Replace with actual UUID from auth.users
  'organizer@eventbooking.com',
  'Event Organizer',
  'organizer',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'organizer',
  full_name = 'Event Organizer',
  updated_at = NOW();

-- Test User 3: Regular User
-- Email: user@eventbooking.com
-- Password: user123
-- After creating this user in Supabase Auth, get their UUID and replace 'regular-user-uuid-here'
INSERT INTO profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  'regular-user-uuid-here', -- Replace with actual UUID from auth.users
  'user@eventbooking.com',
  'Regular User',
  'user',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  role = 'user',
  full_name = 'Regular User',
  updated_at = NOW();

-- Sample Events (created by the organizer)
-- Replace 'organizer-user-uuid-here' with the actual organizer UUID
INSERT INTO events (
  title,
  description,
  start_date,
  end_date,
  location,
  price,
  max_attendees,
  status,
  organizer_id,
  image_url
) VALUES 
(
  'Tech Conference 2024',
  'Join us for the biggest tech conference of the year! Learn about the latest trends in AI, web development, and cloud computing. Network with industry professionals and discover new opportunities.',
  '2024-03-15 09:00:00+00',
  '2024-03-15 17:00:00+00',
  'Convention Center, San Francisco',
  99.99,
  500,
  'published',
  'organizer-user-uuid-here', -- Replace with actual organizer UUID
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800'
),
(
  'Free Web Development Workshop',
  'Learn the basics of modern web development with React and Next.js. This free workshop is perfect for beginners who want to start their journey in web development.',
  '2024-03-20 14:00:00+00',
  '2024-03-20 18:00:00+00',
  'Community Center, Downtown',
  0.00,
  50,
  'published',
  'organizer-user-uuid-here', -- Replace with actual organizer UUID
  'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=800'
),
(
  'Startup Networking Event',
  'Connect with fellow entrepreneurs, investors, and startup enthusiasts. Share ideas, find co-founders, and learn from successful startup stories.',
  '2024-03-25 18:00:00+00',
  '2024-03-25 21:00:00+00',
  'Innovation Hub, Silicon Valley',
  25.00,
  100,
  'published',
  'organizer-user-uuid-here', -- Replace with actual organizer UUID
  'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800'
),
(
  'Draft Event - Music Festival',
  'This is a draft event for a music festival. It will be published later.',
  '2024-04-10 12:00:00+00',
  '2024-04-12 23:00:00+00',
  'Central Park, New York',
  150.00,
  1000,
  'draft',
  'organizer-user-uuid-here', -- Replace with actual organizer UUID
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'
);

-- Sample Bookings (made by the regular user)
-- Replace UUIDs with actual user and event UUIDs after creating them
INSERT INTO bookings (
  event_id,
  user_id,
  quantity,
  total_amount,
  status,
  booking_date
) VALUES 
(
  (SELECT id FROM events WHERE title = 'Free Web Development Workshop' LIMIT 1),
  'regular-user-uuid-here', -- Replace with actual regular user UUID
  1,
  0.00,
  'confirmed',
  NOW() - INTERVAL '2 days'
),
(
  (SELECT id FROM events WHERE title = 'Startup Networking Event' LIMIT 1),
  'regular-user-uuid-here', -- Replace with actual regular user UUID
  2,
  50.00,
  'confirmed',
  NOW() - INTERVAL '1 day'
);

-- Function to help find user UUIDs (run this after creating users in Supabase Auth)
-- This is a helper query to see all users and their UUIDs
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Function to update user roles easily
CREATE OR REPLACE FUNCTION update_user_role(user_email TEXT, new_role user_role)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET role = new_role, updated_at = NOW()
  WHERE email = user_email;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example usage of the function:
-- SELECT update_user_role('admin@eventbooking.com', 'admin');
-- SELECT update_user_role('organizer@eventbooking.com', 'organizer');
-- SELECT update_user_role('user@eventbooking.com', 'user');

-- Query to check all profiles and their roles
-- SELECT email, full_name, role, created_at FROM profiles ORDER BY created_at;

-- Query to check all events
-- SELECT title, status, price, organizer_id, created_at FROM events ORDER BY created_at;

-- Query to check all bookings
-- SELECT b.*, e.title as event_title, p.email as user_email
-- FROM bookings b
-- JOIN events e ON b.event_id = e.id
-- JOIN profiles p ON b.user_id = p.id
-- ORDER BY b.created_at;

-- ========================================
-- ADMIN ROLE MANAGEMENT SCRIPTS
-- ========================================

-- 1. Make ANY existing user an admin by email
-- Replace 'user@example.com' with the actual email address
-- UPDATE profiles SET role = 'admin', updated_at = NOW() WHERE email = 'user@example.com';

-- 2. Make ANY existing user an admin by user ID
-- Replace 'user-uuid-here' with the actual user UUID
-- UPDATE profiles SET role = 'admin', updated_at = NOW() WHERE id = 'user-uuid-here';

-- 3. Function to promote any user to admin by email
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    user_found BOOLEAN;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE email = user_email) INTO user_found;
    
    IF NOT user_found THEN
        RETURN 'Error: User with email ' || user_email || ' not found';
    END IF;
    
    -- Update user role to admin
    UPDATE profiles
    SET role = 'admin', updated_at = NOW()
    WHERE email = user_email;
    
    RETURN 'Success: User ' || user_email || ' is now an admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to promote any user to admin by UUID
CREATE OR REPLACE FUNCTION make_user_admin_by_id(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_found BOOLEAN;
    user_email TEXT;
BEGIN
    -- Check if user exists and get their email
    SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id) INTO user_found;
    SELECT email FROM profiles WHERE id = user_id INTO user_email;
    
    IF NOT user_found THEN
        RETURN 'Error: User with ID ' || user_id || ' not found';
    END IF;
    
    -- Update user role to admin
    UPDATE profiles
    SET role = 'admin', updated_at = NOW()
    WHERE id = user_id;
    
    RETURN 'Success: User ' || user_email || ' (ID: ' || user_id || ') is now an admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Batch function to make multiple users admin
CREATE OR REPLACE FUNCTION make_multiple_users_admin(user_emails TEXT[])
RETURNS TEXT AS $$
DECLARE
    email TEXT;
    result_message TEXT := '';
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    FOREACH email IN ARRAY user_emails
    LOOP
        IF EXISTS(SELECT 1 FROM profiles WHERE email = email) THEN
            UPDATE profiles
            SET role = 'admin', updated_at = NOW()
            WHERE email = email;
            success_count := success_count + 1;
            result_message := result_message || 'Success: ' || email || ' is now admin. ';
        ELSE
            error_count := error_count + 1;
            result_message := result_message || 'Error: ' || email || ' not found. ';
        END IF;
    END LOOP;
    
    RETURN 'Processed ' || array_length(user_emails, 1) || ' users. ' ||
           'Success: ' || success_count || ', Errors: ' || error_count || '. ' || result_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to make the first registered user admin (useful for initial setup)
CREATE OR REPLACE FUNCTION make_first_user_admin()
RETURNS TEXT AS $$
DECLARE
    first_user_id UUID;
    first_user_email TEXT;
BEGIN
    -- Get the first user (oldest created_at)
    SELECT id INTO first_user_id
    FROM profiles
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF first_user_id IS NULL THEN
        RETURN 'Error: No users found in the system';
    END IF;
    
    -- Get user email
    SELECT email INTO first_user_email FROM profiles WHERE id = first_user_id;
    
    -- Update user role to admin
    UPDATE profiles
    SET role = 'admin', updated_at = NOW()
    WHERE id = first_user_id;
    
    RETURN 'Success: First user ' || first_user_email || ' is now an admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- USAGE EXAMPLES
-- ========================================

-- Example 1: Make a specific user admin by email
-- SELECT make_user_admin('john@example.com');

-- Example 2: Make a specific user admin by UUID
-- SELECT make_user_admin_by_id('123e4567-e89b-12d3-a456-426614174000');

-- Example 3: Make multiple users admin at once
-- SELECT make_multiple_users_admin(ARRAY['user1@example.com', 'user2@example.com', 'user3@example.com']);

-- Example 4: Make the first registered user admin (useful for initial setup)
-- SELECT make_first_user_admin();

-- Example 5: Direct SQL update by email (replace with actual email)
-- UPDATE profiles SET role = 'admin', updated_at = NOW() WHERE email = 'your-email@example.com';

-- Example 6: Direct SQL update by UUID (replace with actual UUID)
-- UPDATE profiles SET role = 'admin', updated_at = NOW() WHERE id = 'your-user-uuid-here';

-- ========================================
-- QUICK ADMIN SETUP FOR NEW PROJECTS
-- ========================================

-- OPTION 1: If you just created your first user and want to make them admin:
-- Step 1: Find your user ID and email
-- SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;
-- Step 2: Copy the ID and run (replace with your actual ID):
-- UPDATE profiles SET role = 'admin', updated_at = NOW() WHERE id = 'your-user-id-here';

-- OPTION 2: If you know your email address:
-- UPDATE profiles SET role = 'admin', updated_at = NOW() WHERE email = 'your-email@example.com';

-- OPTION 3: Use the helper function (easiest):
-- SELECT make_user_admin('your-email@example.com');

-- OPTION 4: Make the first user admin automatically:
-- SELECT make_first_user_admin();

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check all users and their roles
-- SELECT p.email, p.full_name, p.role, p.created_at, p.updated_at
-- FROM profiles p
-- ORDER BY p.created_at DESC;

-- Check only admin users
-- SELECT p.email, p.full_name, p.role, p.created_at
-- FROM profiles p
-- WHERE p.role = 'admin'
-- ORDER BY p.created_at DESC;

-- Get user ID by email (useful for other operations)
-- SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';

-- Count users by role
-- SELECT role, COUNT(*) as count FROM profiles GROUP BY role ORDER BY role;