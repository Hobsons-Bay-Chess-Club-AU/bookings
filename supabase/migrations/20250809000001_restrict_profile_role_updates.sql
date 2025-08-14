-- Restrict non-admins from setting or changing roles on profiles
-- Only admins can change the role column

-- Safe function to enforce role rules on INSERT/UPDATE
CREATE OR REPLACE FUNCTION enforce_profile_role_admin_only()
RETURNS trigger AS $$
BEGIN
  SET search_path = '';
  IF TG_OP = 'INSERT' THEN
    -- Non-admins may only insert with default 'user' role
    IF get_user_role(auth.uid()) <> 'admin' AND NEW.role IS DISTINCT FROM 'user'::user_role THEN
      RAISE EXCEPTION 'Only admins can set role on insert';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Non-admins cannot change role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      IF get_user_role(auth.uid()) <> 'admin' THEN
        RAISE EXCEPTION 'Only admins can change role';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create/replace trigger
DROP TRIGGER IF EXISTS trg_profiles_role_guard ON profiles;
CREATE TRIGGER trg_profiles_role_guard
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_profile_role_admin_only();


