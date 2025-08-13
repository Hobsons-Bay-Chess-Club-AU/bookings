-- Add section_rules field to event_sections table
-- This will store JSON configuration for section eligibility rules

ALTER TABLE event_sections ADD COLUMN section_rules JSONB DEFAULT '{}';

-- Add comment to explain the structure
COMMENT ON COLUMN event_sections.section_rules IS 'JSON configuration for section eligibility rules including age constraints and gender restrictions';

-- Create index for performance when querying by rules
CREATE INDEX idx_event_sections_rules ON event_sections USING GIN(section_rules);

-- Example structure for section_rules:
-- {
--   "age_constraint": {
--     "enabled": true,
--     "min_date": "2010-01-01",
--     "max_date": "2015-12-31",
--     "description": "Only participants born between 2010-2015"
--   },
--   "gender_rules": {
--     "enabled": true,
--     "allowed_genders": ["male", "female"],
--     "description": "Open to male and female participants"
--   }
-- }
