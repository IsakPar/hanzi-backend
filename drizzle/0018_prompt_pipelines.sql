-- Migration: Add pipeline support to prompt_templates
-- This converts the single-prompt system to a multi-step pipeline system

-- Add new columns for pipeline configuration
ALTER TABLE prompt_templates ADD COLUMN steps TEXT; -- JSON array of pipeline steps
ALTER TABLE prompt_templates ADD COLUMN cost_limits TEXT; -- JSON object with cost/token limits
ALTER TABLE prompt_templates ADD COLUMN quality_gate TEXT; -- JSON object with validation settings

-- Make body nullable since pipelines use steps instead
-- Note: Existing prompts will keep their body, new pipelines will have steps

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS prompt_templates_status_idx ON prompt_templates(status);


