# Schema Migration Guide

This guide explains how to apply the new schema to fix the infinite recursion error and set up a clean database.

## ⚠️ IMPORTANT: Schema Application Error Fix

If you're getting the error `relation "profiles" does not exist` during signup, it means the schema wasn't applied correctly. Follow these steps:

### Quick Fix for Missing Tables Error:

1. **Go to Supabase Dashboard → SQL Editor**
2. **Run this verification query first:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```
3. **If you don't see `profiles`, `events`, and `bookings` tables, the schema wasn't applied**
4. **Follow Option 1 below for a complete reset**

## Option 1: Complete Database Reset (Recommended for Development)

This is the cleanest approach if you don't have important data to preserve.

### Step 1: Reset Database in Supabase Dashboard

1. **Go to your Supabase project dashboard**
2. **Navigate to Settings → Database**
3. **Scroll down to "Reset Database"**
4. **Click "Reset Database"** - This will delete ALL data and tables
5. **Confirm the reset**
6. **Wait for the reset to complete** (may take a few minutes)

### Step 2: Apply New Schema

1. **Go to SQL Editor in Supabase dashboard**
2. **Create a new query**
3. **Copy and paste the ENTIRE contents of `supabase/schema.sql`** (all 220+ lines)
4. **Click "Run"** to execute the schema
5. **Wait for completion** - you should see "Success. No rows returned"

### Step 3: CRITICAL Verification

Run these verification queries in the SQL editor to ensure everything was created:

```sql
-- 1. Check if tables were created (should show: bookings, events, profiles)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check if custom types were created
SELECT typname FROM pg_type
WHERE typname IN ('user_role', 'booking_status', 'event_status');

-- 3. Check if functions were created
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 4. Check if the critical trigger exists
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'on_auth_user_created';

-- 5. Check if policies were created
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Expected Results:
- **Tables**: Should show `bookings`, `events`, `profiles`
- **Types**: Should show `user_role`, `booking_status`, `event_status`
- **Functions**: Should show `get_user_role`, `handle_new_user`, `update_event_attendees`, `update_updated_at_column`
- **Trigger**: Should show `on_auth_user_created` on `auth.users`
- **Policies**: Should show multiple policies for each table

## Option 2: Manual Migration (Preserve Existing Data)

If you have data you want to keep, use this approach.

### Step 1: Backup Your Data (Optional)

```sql
-- Backup existing data
CREATE TABLE profiles_backup AS SELECT * FROM profiles;
CREATE TABLE events_backup AS SELECT * FROM events;
CREATE TABLE bookings_backup AS SELECT * FROM bookings;
```

### Step 2: Drop Problematic Policies

```sql
-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all events" ON events;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Organizers can create events" ON events;
DROP POLICY IF EXISTS "Organizers can update their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
```

### Step 3: Add Helper Function

```sql
-- Create the helper function to avoid recursion
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result FROM profiles WHERE id = user_id;
  RETURN COALESCE(user_role_result, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 4: Add Missing Profile INSERT Policy

```sql
-- Allow profile creation during signup
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### Step 5: Recreate Fixed Policies

```sql
-- Events policies
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
CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can update their own bookings" ON bookings
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND organizer_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) = 'admin'
  );
```

## Option 3: Quick Fix Script (If Schema is Mostly Correct)

If you just need to fix the recursion issue:

```sql
-- Quick fix for infinite recursion
-- Run this entire script in one go

-- 1. Create helper function
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result FROM profiles WHERE id = user_id;
  RETURN COALESCE(user_role_result, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop and recreate problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all events" ON events;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Organizers can create events" ON events;
DROP POLICY IF EXISTS "Organizers can update their own events" ON events;
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;

-- 3. Add missing INSERT policy for profiles
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Recreate policies with helper function
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

CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Users can update their own bookings" ON bookings
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM events 
      WHERE id = event_id AND organizer_id = auth.uid()
    ) OR
    get_user_role(auth.uid()) = 'admin'
  );
```

## Option 4: Complete Manual Cleanup (Nuclear Option)

If you want to completely start over but can't use the dashboard reset:

```sql
-- WARNING: This will delete ALL your data!
-- Only use this if you want to completely start over

-- 1. Drop all triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_event_attendees_trigger ON bookings;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- 2. Drop all functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_event_attendees();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS update_user_role(TEXT, user_role);
DROP FUNCTION IF EXISTS make_user_admin(TEXT);
DROP FUNCTION IF EXISTS make_user_admin_by_id(UUID);
DROP FUNCTION IF EXISTS make_multiple_users_admin(TEXT[]);
DROP FUNCTION IF EXISTS make_first_user_admin();

-- 3. Drop all tables (this will delete all data!)
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 4. Drop custom types
DROP TYPE IF EXISTS event_status CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- 5. Now run the complete schema from supabase/schema.sql
```

## After Migration

### 1. Test the Application

1. **Restart your development server**: `npm run dev`
2. **Try to access the homepage**: Should load without errors
3. **Test signup**: Create a new user account
4. **Check profile creation**: Verify the profile was created in the database

### 2. Set Up Admin User

After migration, create your first admin user:

```sql
-- Option 1: Make the first user admin
SELECT make_first_user_admin();

-- Option 2: Make specific user admin by email
SELECT make_user_admin('your-email@example.com');

-- Option 3: Direct update
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 3. Add Test Data (Optional)

If you want sample data for testing:

1. **Update UUIDs in `supabase/users.sql`** with real user IDs
2. **Run the users.sql script** in the SQL editor

## Verification Queries

After migration, run these to verify everything is working:

```sql
-- Check tables exist
\dt

-- Check functions exist
\df

-- Check policies exist
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Test user role function
SELECT get_user_role(auth.uid());

-- Check if you can create a profile (should not error)
SELECT auth.uid();
```

## Removing Booking Unique Constraint

If you need to allow users to book the same event multiple times, you need to remove the unique constraint on the bookings table.

### Option 1: Using the Migration Script

Run the migration script in the SQL editor:

```sql
-- Migration to remove the unique constraint on bookings table
-- This allows users to book the same event multiple times

-- Drop the existing constraint
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_event_id_user_id_key;
```

### Option 2: Manual SQL

Run this SQL command directly:

```sql
-- Remove the unique constraint to allow multiple bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_event_id_user_id_key;
```

### Verification

Verify the constraint was removed:

```sql
-- This should return no rows if the constraint was successfully removed
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'bookings'
AND constraint_name = 'bookings_event_id_user_id_key';
```

## Common Issues After Migration

1. **"Function does not exist" errors**: Make sure you ran the complete schema
2. **"Permission denied" errors**: Check that RLS policies are properly created
3. **"Infinite recursion" still occurs**: Make sure you dropped the old policies before creating new ones
4. **"duplicate key value violates unique constraint"**: If you're getting this error when a user tries to book the same event multiple times, make sure you've removed the unique constraint on the bookings table

## Need Help?

If you encounter issues during migration:

1. Check the [TROUBLESHOOTING.md](TROUBLESHOOTING.md) file
2. Verify each step was completed successfully
3. Use the verification queries to identify what's missing
4. Consider using Option 1 (complete reset) for the cleanest setup