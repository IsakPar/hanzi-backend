-- AI Tutor Lesson Cache
-- Stores generated lessons for reuse (same input = same output at $0 cost)

CREATE TABLE IF NOT EXISTS tutor_lesson_cache (
  cache_key TEXT PRIMARY KEY,
  hsk_level INTEGER NOT NULL,
  position_bucket INTEGER NOT NULL,
  focus_words_hash TEXT NOT NULL,
  focus_words_json TEXT NOT NULL,
  lesson_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_hit_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tutor_cache_hsk_bucket 
ON tutor_lesson_cache(hsk_level, position_bucket);

CREATE INDEX IF NOT EXISTS idx_tutor_cache_hits 
ON tutor_lesson_cache(hit_count DESC, last_hit_at DESC);

CREATE INDEX IF NOT EXISTS idx_tutor_cache_created 
ON tutor_lesson_cache(created_at);

