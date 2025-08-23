-- Update the ban checking function to include middle name matching
CREATE OR REPLACE FUNCTION is_participant_banned(
    p_first_name VARCHAR(255),
    p_middle_name VARCHAR(255) DEFAULT NULL,
    p_last_name VARCHAR(255),
    p_date_of_birth DATE
)
RETURNS BOOLEAN AS $$
DECLARE
    ban_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ban_count
    FROM ban_list
    WHERE LOWER(first_name) = LOWER(p_first_name)
      AND LOWER(last_name) = LOWER(p_last_name)
      AND date_of_birth = p_date_of_birth
      AND active = true
      AND (
          -- Exact middle name match (both have middle names and they match)
          (middle_name IS NOT NULL AND p_middle_name IS NOT NULL AND LOWER(middle_name) = LOWER(p_middle_name))
          OR
          -- One or both don't have middle names - match by first + last + DOB only
          (middle_name IS NULL OR p_middle_name IS NULL OR TRIM(middle_name) = '' OR TRIM(p_middle_name) = '')
      );
    
    RETURN ban_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the function to add participant to ban list with middle name
CREATE OR REPLACE FUNCTION add_participant_to_ban_list(
    p_first_name VARCHAR(255),
    p_middle_name VARCHAR(255) DEFAULT NULL,
    p_last_name VARCHAR(255),
    p_date_of_birth DATE,
    p_created_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    ban_id UUID;
BEGIN
    -- Check if already banned (using updated function)
    IF is_participant_banned(p_first_name, p_middle_name, p_last_name, p_date_of_birth) THEN
        RAISE EXCEPTION 'Participant is already banned';
    END IF;
    
    -- Insert into ban list
    INSERT INTO ban_list (first_name, middle_name, last_name, date_of_birth, created_by, notes)
    VALUES (p_first_name, p_middle_name, p_last_name, p_date_of_birth, p_created_by, p_notes)
    RETURNING id INTO ban_id;
    
    RETURN ban_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the index to include middle name for better performance
DROP INDEX IF EXISTS idx_ban_list_names;
CREATE INDEX idx_ban_list_names ON ban_list(first_name, middle_name, last_name);

-- Add a comment explaining the middle name matching logic
COMMENT ON FUNCTION is_participant_banned(VARCHAR, VARCHAR, VARCHAR, DATE) IS 'Checks if a participant is banned. Includes middle name matching when available, but allows matches with or without middle names for backwards compatibility.';
