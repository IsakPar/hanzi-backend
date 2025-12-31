-- Add metadata fields to story_series table
-- Supports extended series info from content-planner JSON

ALTER TABLE story_series ADD COLUMN access_tier TEXT DEFAULT 'free';
ALTER TABLE story_series ADD COLUMN tags TEXT;
ALTER TABLE story_series ADD COLUMN metadata TEXT;

