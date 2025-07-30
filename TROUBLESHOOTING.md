# Troubleshooting Guide

This guide covers common issues you might encounter when setting up and running the Event Booking System.

## Database Issues

### 1. Duplicate Key Value Violates Unique Constraint

**Error Message:**
```
ERROR: duplicate key value violates unique constraint "bookings_event_id_user_id_key"
DETAIL: Key (event_id, user_id)=(some-uuid, some-uuid) already exists.
```

**Cause:**
The bookings table has a unique constraint that prevents a user from booking the same event multiple times. This constraint is defined in the schema as `UNIQUE(event_id, user_id)`.

**Solution:**

1. **Remove the unique constraint** - Run this in Supabase SQL Editor:
```sql
-- Remove the unique constraint to allow multiple bookings
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_event_id_user_id_key;
```

2. **Verify the constraint was removed:**
```sql
-- This should return no rows if the constraint was successfully removed
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'bookings'
AND constraint_name = 'bookings_event_id_user_id_key';
```

3. **If you're setting up a new database**, make sure to use the updated schema files that don't include this constraint.

### 2. Profiles Table Does Not Exist Error

**Error Message:**
```
ERROR: relation "profiles" does not exist (SQLSTATE 42P01)
Database error saving new user
```

**Cause:**
The database schema wasn't applied correctly or completely. The `handle_new_user()` trigger is trying to insert into the profiles table during signup, but the table doesn't exist.

**Solution:**

1. **Check if tables exist** - Run this in Supabase SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

2. **If no tables exist or profiles is missing:**
   - Go to **Settings → Database** in Supabase Dashboard
   - Click **"Reset Database"** (this will delete all data)
   - Go to **SQL Editor**
   - Copy the **entire contents** of `supabase/schema.sql` (all 220+ lines)
   - Paste and click **"Run"**

3. **Verify the schema was applied correctly:**
```sql
-- Should return: bookings, events, profiles
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should return the trigger that creates profiles
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name = 'on_auth_user_created';
```

4. **Test signup again** - The error should be resolved.

### 2. Infinite Recursion Error in Profiles Policy

**Error Message:**
```
Error fetching events: {
  code: '42P17',
  details: null,
  hint: null,
  message: 'infinite recursion detected in policy for relation "profiles"'
}
```

**Cause:** 
This happens when Row Level Security (RLS) policies reference each other in a circular way, particularly when checking user roles.

**Solution:**
1. **Use the Updated Schema**: Make sure you're using the latest `supabase/schema.sql` file which includes the `get_user_role()` helper function.

2. **If you already have the old schema applied**, run this fix in your Supabase SQL editor:

```sql
-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all events" ON events;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;

-- Create the helper function
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result FROM profiles WHERE id = user_id;
  RETURN COALESCE(user_role_result, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the policies using the helper function
CREATE POLICY "Admins can view all events" ON events
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- Update other policies that had recursion issues
DROP POLICY IF EXISTS "Organizers can create events" ON events;
CREATE POLICY "Organizers can create events" ON events
  FOR INSERT WITH CHECK (
    organizer_id = auth.uid() AND
    get_user_role(auth.uid()) IN ('organizer', 'admin')
  );

DROP POLICY IF EXISTS "Organizers can update their own events" ON events;
CREATE POLICY "Organizers can update their own events" ON events
  FOR UPDATE USING (
    organizer_id = auth.uid() OR
    get_user_role(auth.uid()) = 'admin'
  );

DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
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

### 2. Profile Creation Issues

**Error:** Users can't sign up or profiles aren't created automatically.

**Solution:**
1. Make sure the `handle_new_user()` function and trigger are created:

```sql
-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

2. Add the missing INSERT policy for profiles:

```sql
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

## Environment Variables Issues

### 1. Invalid URL Error

**Error:** `TypeError: Invalid URL` in middleware or client

**Cause:** Environment variables are not properly set or contain placeholder values.

**Solution:**
1. Check your `.env.local` file has real values (not placeholders):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

2. Restart your development server after changing environment variables:
```bash
npm run dev
```

### 2. Supabase Connection Issues

**Error:** Connection refused or authentication errors

**Solution:**
1. Verify your Supabase project URL and keys in the Supabase dashboard
2. Make sure your project is not paused (free tier projects pause after inactivity)
3. Check that RLS is properly configured

## Authentication Issues

### 1. Users Can't Access Protected Routes

**Error:** Redirected to login even when authenticated

**Cause:** Middleware or authentication utilities not working properly.

**Solution:**
1. Check that your middleware is properly configured in `src/middleware.ts`
2. Verify the `getCurrentUser()` and `getCurrentProfile()` functions work
3. Test authentication by checking the browser's Application tab for auth tokens

### 2. Role-Based Access Not Working

**Error:** Users with organizer/admin roles can't access their dashboards

**Solution:**
1. Verify the user's role in the database:
```sql
SELECT email, role FROM profiles WHERE email = 'your-email@example.com';
```

2. Use the admin role management functions:
```sql
SELECT make_user_admin('your-email@example.com');
```

## Stripe Integration Issues

### 1. Payment Processing Errors

**Error:** Stripe checkout fails or webhooks don't work

**Solution:**
1. Verify your Stripe keys are correct and from the right environment (test/live)
2. Make sure webhook endpoints are configured in Stripe dashboard
3. Check that the webhook secret matches your environment variable

### 2. Booking Status Not Updating

**Error:** Bookings remain "pending" after successful payment

**Cause:** Webhook not properly configured or not receiving events.

**Solution:**
1. Check Stripe webhook logs in the Stripe dashboard
2. Verify webhook URL is accessible: `your-domain/api/webhooks/stripe`
3. Ensure webhook events are configured: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`

## Development Issues

### 1. TypeScript Errors

**Error:** Type errors in components or utilities

**Solution:**
1. Make sure all dependencies are installed: `npm install`
2. Check that your `tsconfig.json` is properly configured
3. Restart your TypeScript server in VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"

### 2. Build Errors

**Error:** Next.js build fails

**Solution:**
1. Check for unused imports or variables
2. Verify all environment variables are available during build
3. Run `npm run build` locally to identify issues

## Getting Help

If you're still experiencing issues:

1. **Check the Console**: Look for detailed error messages in the browser console
2. **Check Supabase Logs**: View logs in your Supabase dashboard
3. **Verify Database State**: Use the verification queries in `supabase/users.sql`
4. **Test Step by Step**: Isolate the issue by testing individual components

## Common Verification Queries

Run these in your Supabase SQL editor to check system state:

```sql
-- Check all users and roles
SELECT email, role, created_at FROM profiles ORDER BY created_at;

-- Check events
SELECT title, status, organizer_id, created_at FROM events ORDER BY created_at;

-- Check bookings
SELECT b.*, e.title as event_title, p.email as user_email 
FROM bookings b 
JOIN events e ON b.event_id = e.id 
JOIN profiles p ON b.user_id = p.id 
ORDER BY b.created_at;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';