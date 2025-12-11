-- Add releases table for tracking content releases
CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  hsk_level INTEGER NOT NULL,
  version TEXT NOT NULL,
  released_by TEXT,
  release_notes TEXT,
  
  -- Stats snapshot
  lessons_added INTEGER DEFAULT 0,
  lessons_updated INTEGER DEFAULT 0,
  lessons_removed INTEGER DEFAULT 0,
  vocabulary_added INTEGER DEFAULT 0,
  vocabulary_updated INTEGER DEFAULT 0,
  
  -- Content snapshot (for rollback)
  lesson_ids TEXT, -- JSON array of lesson IDs included
  content_hash TEXT, -- Hash of all content for verification
  
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS releases_hsk_level_idx ON releases(hsk_level);
CREATE INDEX IF NOT EXISTS releases_version_idx ON releases(version);
CREATE INDEX IF NOT EXISTS releases_created_at_idx ON releases(created_at);

