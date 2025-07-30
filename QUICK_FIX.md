# Quick Fix for "Profiles Table Does Not Exist" Error

If you're getting this error during signup:
```
ERROR: relation "profiles" does not exist (SQLSTATE 42P01)
Database error saving new user
```

## Immediate Solution (5 minutes)

### Step 1: Reset Your Database
1. Go to your **Supabase Dashboard**
2. Click **Settings** → **Database**
3. Scroll down and click **"Reset Database"**
4. Confirm the reset (this deletes all data but gives you a clean start)

### Step 2: Apply the Complete Schema
1. Go to **SQL Editor** in Supabase Dashboard
2. Create a **New Query**
3. **Copy the ENTIRE contents** of `supabase/schema.sql` from this project
4. **Paste it** into the SQL Editor
5. Click **"Run"**
6. Wait for "Success. No rows returned" message

### Step 3: Verify It Worked
Run this query in the SQL Editor:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- `bookings`
- `events` 
- `profiles`

### Step 4: Test Signup
1. Go back to your application at `http://localhost:3000`
2. Try to sign up with a new account
3. It should work without errors now

### Step 5: Create Your First Admin User
After successful signup, run this in SQL Editor:
```sql
SELECT make_first_user_admin();
```

## Why This Happened

The error occurs when:
- The database schema wasn't applied completely
- Only part of the schema was run
- The `profiles` table creation failed
- The database was in an inconsistent state

## Prevention

Always:
1. **Copy the ENTIRE schema file** (not just parts)
2. **Wait for completion** before testing
3. **Verify tables exist** before using the app
4. **Use database reset** for clean setup in development

## Still Having Issues?

If this doesn't work:
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more solutions
2. See [SCHEMA_MIGRATION.md](SCHEMA_MIGRATION.md) for alternative approaches
3. Verify your environment variables are correct in `.env.local`

## Success Indicators

✅ No errors when running the schema
✅ All three tables (profiles, events, bookings) exist
✅ Signup works without database errors
✅ You can create an admin user
✅ The application loads without infinite recursion errors