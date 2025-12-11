-- Add display_order column to lessons table
-- Used for portal UI organization (sorting lessons in the editor)

ALTER TABLE lessons ADD COLUMN display_order INTEGER;

-- Create index for efficient ordering queries
CREATE INDEX IF NOT EXISTS lessons_display_order_idx ON lessons(hsk_level, display_order);

