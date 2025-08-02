-- Add FIDE and ACF player field types to custom form fields
-- This migration adds support for FIDE and ACF player search fields in custom forms

-- Update the form_field_type enum to include the new player field types
-- Note: PostgreSQL doesn't allow direct ALTER TYPE with new values, so we need to recreate it

-- First, add a temporary column
ALTER TABLE custom_form_fields ADD COLUMN temp_type TEXT;

-- Update existing values
UPDATE custom_form_fields SET temp_type = type::TEXT;

-- Drop the old constraint and column
ALTER TABLE custom_form_fields DROP COLUMN type;

-- Recreate the column with the new enum values
ALTER TABLE custom_form_fields ADD COLUMN type VARCHAR(20) CHECK (type IN (
    'text', 'email', 'phone', 'number', 'date', 'select', 'multiselect', 
    'checkbox', 'textarea', 'file', 'fide_id', 'acf_id'
));

-- Restore the data
UPDATE custom_form_fields SET type = temp_type;

-- Drop the temporary column
ALTER TABLE custom_form_fields DROP COLUMN temp_type;

-- Add NOT NULL constraint back
ALTER TABLE custom_form_fields ALTER COLUMN type SET NOT NULL;

-- Add comment explaining the new field types
COMMENT ON COLUMN custom_form_fields.type IS 'Form field type including special player field types: fide_id for FIDE player search, acf_id for ACF player search';
