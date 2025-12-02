-- Migration: Move lesson storage from D1 to R2
-- This drops the lesson_json column from tutor_lesson_cache
-- Lessons are now stored in R2 at: tutor-lessons/{cache_key}.json

-- SQLite doesn't support DROP COLUMN directly in older versions
-- We need to recreate the table without lesson_json

-- Step 1: Create new table without lesson_json
CREATE TABLE IF NOT EXISTS tutor_lesson_cache_new (
  cache_key TEXT PRIMARY KEY,
  hsk_level INTEGER NOT NULL,
  position_bucket INTEGER NOT NULL,
  focus_words_hash TEXT NOT NULL,
  focus_words_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_hit_at INTEGER NOT NULL
);

-- Step 2: Copy data (if old table exists)
INSERT OR IGNORE INTO tutor_lesson_cache_new (
  cache_key, hsk_level, position_bucket, focus_words_hash,
  focus_words_json, created_at, hit_count, last_hit_at
)
SELECT 
  cache_key, hsk_level, position_bucket, focus_words_hash,
  focus_words_json, created_at, hit_count, last_hit_at
FROM tutor_lesson_cache
WHERE EXISTS (SELECT 1 FROM tutor_lesson_cache LIMIT 1);

-- Step 3: Drop old table
DROP TABLE IF EXISTS tutor_lesson_cache;

-- Step 4: Rename new table
ALTER TABLE tutor_lesson_cache_new RENAME TO tutor_lesson_cache;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_tutor_cache_hsk_bucket 
ON tutor_lesson_cache(hsk_level, position_bucket);

CREATE INDEX IF NOT EXISTS idx_tutor_cache_hits 
ON tutor_lesson_cache(hit_count DESC, last_hit_at DESC);

CREATE INDEX IF NOT EXISTS idx_tutor_cache_created 
ON tutor_lesson_cache(created_at DESC);

