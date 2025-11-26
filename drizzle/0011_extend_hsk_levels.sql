-- Migration: Extend HSK Level Support from 1-6 to 1-9
-- HSK 3.0 introduced levels 7-9 with updated word counts

-- Update vocabulary table constraint
ALTER TABLE vocabulary DROP CONSTRAINT IF EXISTS vocabulary_hsk_level_check;
ALTER TABLE vocabulary ADD CONSTRAINT vocabulary_hsk_level_check 
  CHECK (hsk_level >= 1 AND hsk_level <= 9);

-- Update lessons table constraint
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_hsk_level_check;
ALTER TABLE lessons ADD CONSTRAINT lessons_hsk_level_check 
  CHECK (hsk_level >= 1 AND hsk_level <= 9);

-- Update stories table constraint
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_hsk_level_check;
ALTER TABLE stories ADD CONSTRAINT stories_hsk_level_check 
  CHECK (hsk_level >= 1 AND hsk_level <= 9);

-- Add display_order column to lessons for portal organization
-- (Not used by mobile app, just for visual sorting in portal)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS display_order INTEGER;
CREATE INDEX IF NOT EXISTS lessons_display_order_idx ON lessons(hsk_level, display_order);

-- Add content export tracking
CREATE TABLE IF NOT EXISTS content_exports (
  id TEXT PRIMARY KEY,
  content_type TEXT NOT NULL, -- 'vocabulary', 'lessons', 'stories'
  hsk_level INTEGER NOT NULL CHECK (hsk_level >= 1 AND hsk_level <= 9),
  version TEXT NOT NULL, -- Semantic versioning: '1.0.5'
  content_hash TEXT NOT NULL, -- SHA256 hash of exported JSON
  file_url TEXT NOT NULL, -- R2 URL
  exported_by TEXT, -- User ID
  exported_at INTEGER DEFAULT (strftime('%s', 'now')),
  file_size_bytes INTEGER,
  record_count INTEGER, -- Number of items in export
  UNIQUE(content_type, hsk_level)
);

CREATE INDEX content_exports_type_idx ON content_exports(content_type, hsk_level);

-- Add premium/free tier to stories
ALTER TABLE stories ADD COLUMN IF NOT EXISTS access_tier TEXT DEFAULT 'premium' 
  CHECK (access_tier IN ('free', 'premium'));
CREATE INDEX IF NOT EXISTS stories_access_tier_idx ON stories(access_tier);

