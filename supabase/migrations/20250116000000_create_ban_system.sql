-- Create ban list table
CREATE TABLE ban_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    last_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Create indexes for performance
CREATE INDEX idx_ban_list_names ON ban_list(first_name, last_name);
CREATE INDEX idx_ban_list_dob ON ban_list(date_of_birth);
CREATE INDEX idx_ban_list_active ON ban_list(active);
CREATE INDEX idx_ban_list_created_by ON ban_list(created_by);

-- Add updated_at trigger for ban_list
CREATE TRIGGER update_ban_list_updated_at
    BEFORE UPDATE ON ban_list
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for ban_list
ALTER TABLE ban_list ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins and organizers can view ban list
CREATE POLICY "Admins and organizers can view ban list" ON ban_list
    FOR SELECT USING (
        get_user_role(auth.uid()) IN ('admin', 'organizer')
    );

-- Policy: Only admins can insert into ban list
CREATE POLICY "Admins can insert into ban list" ON ban_list
    FOR INSERT WITH CHECK (
        get_user_role(auth.uid()) = 'admin'
    );

-- Policy: Only admins can update ban list
CREATE POLICY "Admins can update ban list" ON ban_list
    FOR UPDATE USING (
        get_user_role(auth.uid()) = 'admin'
    );

-- Policy: Only admins can delete from ban list
CREATE POLICY "Admins can delete from ban list" ON ban_list
    FOR DELETE USING (
        get_user_role(auth.uid()) = 'admin'
    );

-- Function to check if a participant is banned
CREATE OR REPLACE FUNCTION is_participant_banned(
    p_first_name VARCHAR(255),
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
      AND active = true;
    
    RETURN ban_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add participant to ban list (called when organizer bans a participant)
CREATE OR REPLACE FUNCTION add_participant_to_ban_list(
    p_first_name VARCHAR(255),
    p_last_name VARCHAR(255),
    p_date_of_birth DATE,
    p_created_by UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    ban_id UUID;
BEGIN
    -- Check if already banned
    IF is_participant_banned(p_first_name, p_last_name, p_date_of_birth) THEN
        RAISE EXCEPTION 'Participant is already banned';
    END IF;
    
    -- Insert into ban list
    INSERT INTO ban_list (first_name, last_name, date_of_birth, created_by, notes)
    VALUES (p_first_name, p_last_name, p_date_of_birth, p_created_by, p_notes)
    RETURNING id INTO ban_id;
    
    RETURN ban_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
