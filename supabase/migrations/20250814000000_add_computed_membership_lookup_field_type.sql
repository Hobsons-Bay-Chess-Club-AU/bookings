-- Add computed_membership_lookup to custom_fields.type CHECK constraint

-- Add a temporary column to hold existing values
ALTER TABLE custom_fields ADD COLUMN temp_type TEXT;

-- Copy existing type values
UPDATE custom_fields SET temp_type = type::TEXT;

-- Drop the old constrained column
ALTER TABLE custom_fields DROP COLUMN type;

-- Recreate the column with the extended set including computed_membership_lookup
ALTER TABLE custom_fields ADD COLUMN type VARCHAR(40) CHECK (type IN (
    'text', 'email', 'phone', 'number', 'date', 'select', 'multiselect',
    'checkbox', 'textarea', 'file', 'fide_id', 'acf_id', 'computed_membership_lookup'
));

-- Restore original values
UPDATE custom_fields SET type = temp_type;

-- Cleanup temp column
ALTER TABLE custom_fields DROP COLUMN temp_type;

-- Ensure NOT NULL
ALTER TABLE custom_fields ALTER COLUMN type SET NOT NULL;

COMMENT ON COLUMN custom_fields.type IS 'Form field type including special types like fide_id, acf_id, and computed_membership_lookup (backend-only).';


