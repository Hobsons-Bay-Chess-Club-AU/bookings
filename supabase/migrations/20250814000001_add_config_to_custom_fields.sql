-- Add config and admin_only to custom_fields to support reusable computed field settings
-- Idempotent add-if-not-exists style using DO blocks

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='custom_fields' AND column_name='config'
    ) THEN
        ALTER TABLE public.custom_fields ADD COLUMN config jsonb;
        COMMENT ON COLUMN public.custom_fields.config IS 'Optional JSON configuration for advanced/custom field types (e.g., computed_membership_lookup).';
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema='public' AND table_name='custom_fields' AND column_name='admin_only'
    ) THEN
        ALTER TABLE public.custom_fields ADD COLUMN admin_only boolean DEFAULT false;
        COMMENT ON COLUMN public.custom_fields.admin_only IS 'If true, field is hidden from participants and visible only to admins.';
    END IF;
END$$;


