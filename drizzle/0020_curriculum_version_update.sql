-- Add lesson_count to curriculum_version for tracking derived curriculum
ALTER TABLE curriculum_version ADD COLUMN lesson_count INTEGER NOT NULL DEFAULT 0;

