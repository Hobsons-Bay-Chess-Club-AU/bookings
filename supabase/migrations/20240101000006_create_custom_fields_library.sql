-- Create custom_fields table for reusable field templates
CREATE TABLE public.custom_fields (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Field definition (same structure as event form fields)
    name text NOT NULL,
    label text NOT NULL,
    description text,
    type form_field_type NOT NULL,
    required boolean DEFAULT false,
    options jsonb, -- For select/multiselect fields
    validation jsonb, -- Validation rules
    placeholder text,
    
    -- Library management
    is_global boolean DEFAULT false, -- Admin-created global fields
    usage_count integer DEFAULT 0, -- Track how often it's used
    
    -- Metadata
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    
    -- Constraints
    CONSTRAINT custom_fields_name_organizer_unique UNIQUE (name, organizer_id)
);

-- Create indexes for performance
CREATE INDEX idx_custom_fields_organizer_id ON custom_fields(organizer_id);
CREATE INDEX idx_custom_fields_type ON custom_fields(type);
CREATE INDEX idx_custom_fields_usage_count ON custom_fields(usage_count DESC);
CREATE INDEX idx_custom_fields_is_global ON custom_fields(is_global) WHERE is_global = true;

-- Add RLS policies
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own custom fields
CREATE POLICY "Users can manage their own custom fields" ON custom_fields
    FOR ALL USING (
        auth.uid() = organizer_id
    );

-- Policy: Users can view global custom fields
CREATE POLICY "Users can view global custom fields" ON custom_fields
    FOR SELECT USING (
        is_global = true
    );

-- Policy: Admins can manage global custom fields
CREATE POLICY "Admins can manage global custom fields" ON custom_fields
    FOR ALL USING (
        get_user_role(auth.uid()) = 'admin'
    );

-- Add updated_at trigger
CREATE TRIGGER update_custom_fields_updated_at
    BEFORE UPDATE ON custom_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_custom_field_usage(field_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE custom_fields 
    SET usage_count = usage_count + 1,
        updated_at = now()
    WHERE id = field_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get popular custom fields for an organizer
CREATE OR REPLACE FUNCTION get_popular_custom_fields(organizer_uuid uuid, limit_count integer DEFAULT 10)
RETURNS TABLE (
    id uuid,
    name text,
    label text,
    description text,
    type form_field_type,
    required boolean,
    options jsonb,
    validation jsonb,
    placeholder text,
    usage_count integer,
    is_global boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cf.id,
        cf.name,
        cf.label,
        cf.description,
        cf.type,
        cf.required,
        cf.options,
        cf.validation,
        cf.placeholder,
        cf.usage_count,
        cf.is_global
    FROM custom_fields cf
    WHERE cf.organizer_id = organizer_uuid OR cf.is_global = true
    ORDER BY cf.usage_count DESC, cf.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to search custom fields
CREATE OR REPLACE FUNCTION search_custom_fields(
    organizer_uuid uuid,
    search_query text,
    field_type form_field_type DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    name text,
    label text,
    description text,
    type form_field_type,
    required boolean,
    options jsonb,
    validation jsonb,
    placeholder text,
    usage_count integer,
    is_global boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cf.id,
        cf.name,
        cf.label,
        cf.description,
        cf.type,
        cf.required,
        cf.options,
        cf.validation,
        cf.placeholder,
        cf.usage_count,
        cf.is_global
    FROM custom_fields cf
    WHERE 
        (cf.organizer_id = organizer_uuid OR cf.is_global = true)
        AND (
            search_query IS NULL OR
            cf.label ILIKE '%' || search_query || '%' OR
            cf.name ILIKE '%' || search_query || '%' OR
            cf.description ILIKE '%' || search_query || '%'
        )
        AND (field_type IS NULL OR cf.type = field_type)
    ORDER BY cf.usage_count DESC, cf.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Note: Default global fields can be added later by admins through the UI
-- This avoids issues during initial migration when no admin users exist yet