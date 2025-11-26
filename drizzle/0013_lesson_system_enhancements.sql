-- Migration: Enhance lesson system with types, numbering, and metadata
-- Date: 2025-11-24
-- Purpose: Support lesson types, auto-numbering, and rich metadata

-- Add lesson identification and type
ALTER TABLE lessons ADD COLUMN lesson_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE lessons ADD COLUMN lesson_type TEXT NOT NULL DEFAULT 'lesson';

-- Add metadata fields
ALTER TABLE lessons ADD COLUMN subtitle TEXT;
ALTER TABLE lessons ADD COLUMN estimated_minutes INTEGER DEFAULT 15;
ALTER TABLE lessons ADD COLUMN grammar_points TEXT; -- JSON array
ALTER TABLE lessons ADD COLUMN tags TEXT;           -- JSON array
ALTER TABLE lessons ADD COLUMN target_vocabulary TEXT; -- JSON array of vocab IDs

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS lessons_ordering_idx 
  ON lessons(hsk_level, lesson_type, lesson_number);

CREATE INDEX IF NOT EXISTS lessons_type_idx 
  ON lessons(lesson_type);

-- Update existing lessons to have lesson_number from display_order if it exists
UPDATE lessons 
SET lesson_number = COALESCE(display_order, ROW_NUMBER() OVER (PARTITION BY hsk_level ORDER BY created_at))
WHERE lesson_number = 1;

