-- Migration: Add Units System for Lesson Organization
-- Date: 2025-11-24
-- Purpose: Group lessons into units matching mobile app structure

-- Create units table
CREATE TABLE IF NOT EXISTS units (
  id TEXT PRIMARY KEY,
  hsk_level INTEGER NOT NULL,
  unit_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  gradient_start TEXT DEFAULT '#EEF2FF',
  gradient_end TEXT DEFAULT '#C7D2FE',
  accent_color TEXT DEFAULT '#4F46E5',
  order_index INTEGER,
  is_published INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Add unit relationship to lessons
ALTER TABLE lessons ADD COLUMN unit_id TEXT REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE lessons ADD COLUMN order_in_unit INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS units_hsk_level_idx ON units(hsk_level, unit_number);
CREATE INDEX IF NOT EXISTS units_published_idx ON units(is_published);
CREATE INDEX IF NOT EXISTS lessons_unit_idx ON lessons(unit_id, order_in_unit);

-- Add unique constraint to prevent duplicate unit numbers per HSK level
CREATE UNIQUE INDEX IF NOT EXISTS units_hsk_number_unique ON units(hsk_level, unit_number);

-- Update existing lessons to have order_in_unit = 1 by default
UPDATE lessons SET order_in_unit = 1 WHERE order_in_unit IS NULL;

