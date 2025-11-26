-- Content Analytics Tables Migration
-- Phase 3: Track lesson, story, and vocabulary engagement

-- ═══════════════════════════════════════════════════════════
-- DAILY CONTENT STATS (24 months retention)
-- ═══════════════════════════════════════════════════════════

-- Daily aggregated content statistics
CREATE TABLE IF NOT EXISTS analytics_content_daily (
  date TEXT NOT NULL,
  content_type TEXT NOT NULL,        -- 'lesson' | 'story' | 'vocabulary'
  
  -- Volume metrics
  total_views INTEGER DEFAULT 0,
  total_starts INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  
  -- Time metrics
  avg_time_seconds INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  
  PRIMARY KEY (date, content_type)
);
CREATE INDEX IF NOT EXISTS idx_content_daily_date ON analytics_content_daily(date);

-- Daily per-lesson statistics (more granular)
CREATE TABLE IF NOT EXISTS analytics_lesson_daily (
  date TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  
  views INTEGER DEFAULT 0,
  starts INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  avg_score REAL DEFAULT 0,
  avg_time_seconds INTEGER DEFAULT 0,
  
  PRIMARY KEY (date, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_daily_lesson ON analytics_lesson_daily(lesson_id);

-- Daily per-story statistics
CREATE TABLE IF NOT EXISTS analytics_story_daily (
  date TEXT NOT NULL,
  story_id TEXT NOT NULL,
  
  views INTEGER DEFAULT 0,
  starts INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  avg_time_seconds INTEGER DEFAULT 0,
  
  PRIMARY KEY (date, story_id)
);
CREATE INDEX IF NOT EXISTS idx_story_daily_story ON analytics_story_daily(story_id);

-- HSK level engagement summary (daily)
CREATE TABLE IF NOT EXISTS analytics_hsk_daily (
  date TEXT NOT NULL,
  hsk_level INTEGER NOT NULL,        -- 1-6
  
  lesson_views INTEGER DEFAULT 0,
  lesson_completions INTEGER DEFAULT 0,
  story_views INTEGER DEFAULT 0,
  story_completions INTEGER DEFAULT 0,
  vocab_reviews INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  
  PRIMARY KEY (date, hsk_level)
);
CREATE INDEX IF NOT EXISTS idx_hsk_daily_date ON analytics_hsk_daily(date);

-- Vocabulary learning progress (aggregated)
CREATE TABLE IF NOT EXISTS analytics_vocab_progress (
  date TEXT NOT NULL,
  
  -- Bucket distribution
  words_new INTEGER DEFAULT 0,
  words_weak INTEGER DEFAULT 0,
  words_learning INTEGER DEFAULT 0,
  words_mastered INTEGER DEFAULT 0,
  
  -- Activity
  total_reviews INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  
  PRIMARY KEY (date)
);

